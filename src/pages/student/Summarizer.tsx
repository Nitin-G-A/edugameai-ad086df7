import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BookOpen, FileText, Lightbulb, HelpCircle, Loader2, Upload, Sparkles, File, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker - use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface SummaryResult {
  summary: string;
  keyPoints: string[];
  flashcards: { front: string; back: string }[];
  quizQuestions: { question: string; answer: string }[];
}

const Summarizer = () => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedFileTypes = '.pdf,.doc,.docx,.txt';

  const extractTextFromPDF = async (file: File): Promise<{ text: string; images: string[] }> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    const images: string[] = [];
    
    // Limit to first 20 pages for performance
    const maxPages = Math.min(pdf.numPages, 20);
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
      
      // If text is sparse, render page as image for OCR
      if (pageText.trim().length < 100) {
        try {
          const scale = 1.5;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          if (context) {
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            await page.render({
              canvasContext: context,
              viewport: viewport
            }).promise;
            
            // Convert to base64 with reduced quality for size
            const imageData = canvas.toDataURL('image/jpeg', 0.7);
            images.push(imageData);
          }
        } catch (renderError) {
          console.error('Error rendering page to image:', renderError);
        }
      }
    }
    
    return { text: fullText.trim(), images };
  };

  const extractTextFromDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadedFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, '')); // Use filename as title
    setIsExtractingText(true);
    setPageImages([]);
    
    try {
      let extractedText = '';
      let extractedImages: string[] = [];
      const fileExtension = file.name.toLowerCase().split('.').pop();
      
      if (file.type === 'text/plain' || fileExtension === 'txt') {
        extractedText = await file.text();
      } else if (file.type === 'application/pdf' || fileExtension === 'pdf') {
        const result = await extractTextFromPDF(file);
        extractedText = result.text;
        extractedImages = result.images;
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword' ||
        fileExtension === 'docx' ||
        fileExtension === 'doc'
      ) {
        extractedText = await extractTextFromDocx(file);
      } else {
        toast.error('Unsupported file type. Please use PDF, Word, or Text files.');
        setUploadedFile(null);
        setTitle('');
        setIsExtractingText(false);
        return;
      }
      
      // If we have images (from scanned PDF), we'll use those for AI processing
      if (extractedImages.length > 0) {
        setPageImages(extractedImages);
        // Set a placeholder to indicate we have image content
        if (!extractedText.trim()) {
          setContent('[Image-based document - will be processed with AI vision]');
        } else {
          setContent(extractedText);
        }
        toast.success(`File loaded! ${extractedImages.length} page(s) will be processed with AI vision.`);
      } else if (extractedText.trim()) {
        setContent(extractedText);
        toast.success('File content extracted successfully!');
      } else {
        toast.error('Could not extract text from file. The file may be empty.');
        setUploadedFile(null);
        setTitle('');
        return;
      }
    } catch (error: any) {
      console.error('Error extracting text:', error);
      toast.error('Failed to extract text from file');
      setUploadedFile(null);
      setTitle('');
    } finally {
      setIsExtractingText(false);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setContent('');
    setTitle('');
    setPageImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSummarize = async () => {
    if (!content.trim() && pageImages.length === 0) {
      toast.error('Please enter some content or upload a file to summarize');
      return;
    }

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('ai-summarizer', {
        body: { 
          content: content.includes('[Image-based document') ? '' : content, 
          title,
          images: pageImages.length > 0 ? pageImages : undefined
        },
      });

      if (response.error) throw response.error;

      const data = response.data;
      setResult({
        summary: data.summary,
        keyPoints: data.keyPoints || [],
        flashcards: data.flashcards || [],
        quizQuestions: data.quizQuestions || [],
      });

      await supabase.from('summaries').insert({
        student_id: user?.id,
        title: title || 'Untitled Summary',
        original_content: content.substring(0, 5000), // Limit stored content
        summary: data.summary,
        key_points: data.keyPoints || [],
        flashcards: data.flashcards || [],
        quiz_questions: data.quizQuestions || [],
      });

      toast.success('Summary generated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate summary');
    } finally {
      setIsLoading(false);
    }
  };

  const resetSummarizer = () => {
    setResult(null);
    setContent('');
    setTitle('');
    setUploadedFile(null);
    setPageImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-primary" />
          Lecture Summarizer
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload a document or paste your notes to get AI-generated summaries, flashcards, and quiz questions
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Your Content
            </CardTitle>
            <CardDescription>
              Upload a PDF, Word document, or paste your notes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Upload Area */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Upload Document</label>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptedFileTypes}
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                {!uploadedFile ? (
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    {isExtractingText ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Extracting content...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload PDF, Word, or Text file
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Supports scanned PDFs • Max 10MB
                        </p>
                      </>
                    )}
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <File className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{uploadedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(uploadedFile.size / 1024).toFixed(1)} KB
                          {pageImages.length > 0 && ` • ${pageImages.length} page(s) for vision processing`}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={removeFile}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="mx-4 text-xs text-muted-foreground">or paste text</span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            <div>
              <input
                type="text"
                placeholder="Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background"
              />
            </div>
            <Textarea
              placeholder="Paste your lecture notes, article, or any text content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] resize-none"
            />
            <div className="flex gap-2">
              {result && (
                <Button variant="outline" onClick={resetSummarizer} className="gap-2">
                  Start Over
                </Button>
              )}
              <Button 
                onClick={handleSummarize} 
                disabled={isLoading || (!content.trim() && pageImages.length === 0)} 
                className="flex-1 gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Summary
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              AI Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="h-[300px] flex items-center justify-center text-center">
                <div>
                  <FileText className="w-16 h-16 text-muted mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Your summary, flashcards, and quiz questions will appear here
                  </p>
                </div>
              </div>
            ) : (
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="points">Key Points</TabsTrigger>
                  <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
                  <TabsTrigger value="quiz">Quiz</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="mt-4">
                  <div className="prose prose-sm max-w-none">
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        Summary
                      </h4>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {result.summary}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="points" className="mt-4">
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      Key Points
                    </h4>
                    <ul className="space-y-3">
                      {result.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-3 p-2 rounded-md bg-background">
                          <Badge variant="secondary" className="mt-0.5 shrink-0">
                            {index + 1}
                          </Badge>
                          <span className="text-sm">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </TabsContent>

                <TabsContent value="flashcards" className="mt-4">
                  <div className="space-y-3">
                    {result.flashcards.map((card, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardContent className="p-0">
                          <div className="p-3 bg-primary/5 border-b">
                            <p className="font-medium text-sm flex items-center gap-2">
                              <Badge variant="outline" className="shrink-0">Q{index + 1}</Badge>
                              {card.front}
                            </p>
                          </div>
                          <div className="p-3">
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">Answer: </span>
                              {card.back}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="quiz" className="mt-4">
                  <div className="space-y-3">
                    {result.quizQuestions.map((q, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardContent className="p-0">
                          <div className="p-3 bg-primary/5 border-b">
                            <div className="flex items-start gap-2">
                              <HelpCircle className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                              <p className="font-medium text-sm">{q.question}</p>
                            </div>
                          </div>
                          <div className="p-3">
                            <p className="text-sm">
                              <span className="font-medium">Answer: </span>
                              <span className="text-muted-foreground">{q.answer}</span>
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Summarizer;