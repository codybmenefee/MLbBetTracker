import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  parseCSV, 
  convertToGames, 
  uploadGames, 
  downloadTemplate, 
  parseTextContent,
  extractWordDocText
} from "@/lib/csv-parser";
import { queryClient } from "@/lib/queryClient";
import { Upload, ArrowRight, FileText } from "lucide-react";

export default function UploadSchedule() {
  const [dragActive, setDragActive] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: uploadGames,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Schedule uploaded successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to upload schedule: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setProcessingFile(true);
    
    try {
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      
      // Handle different file types
      if (fileType === "text/csv" || fileName.endsWith(".csv")) {
        // Handle CSV files
        processCSVFile(file);
      } else if (
        fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
        fileName.endsWith(".docx")
      ) {
        // Handle Word documents
        await processWordFile(file);
      } else if (
        fileType === "text/plain" || 
        fileName.endsWith(".txt")
      ) {
        // Handle text files
        processTextFile(file);
      } else {
        toast({
          title: "Unsupported File Type",
          description: "Please upload a CSV, Word document, or text file.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to process file: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setProcessingFile(false);
    }
  };

  const processCSVFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvContent = event.target?.result as string;
        const parsedRows = parseCSV(csvContent);
        const games = convertToGames(parsedRows);
        
        if (games.length === 0) {
          throw new Error("No valid games found in the CSV file");
        }
        
        // Set the game source to "Uploaded Document"
        games.forEach(game => {
          game.source = "Uploaded Document";
        });
        
        uploadMutation.mutate(games);
      } catch (error) {
        toast({
          title: "Error",
          description: `Failed to parse CSV: ${error instanceof Error ? error.message : "Unknown error"}`,
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const processWordFile = async (file: File) => {
    try {
      const textContent = await extractWordDocText(file);
      const parsedRows = parseTextContent(textContent);
      const games = convertToGames(parsedRows);
      
      if (games.length === 0) {
        throw new Error("No valid games found in the Word document");
      }
      
      // Set the game source to "Uploaded Document"
      games.forEach(game => {
        game.source = "Uploaded Document";
      });
      
      uploadMutation.mutate(games);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to parse Word document: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  const processTextFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const textContent = event.target?.result as string;
        const parsedRows = parseTextContent(textContent);
        const games = convertToGames(parsedRows);
        
        if (games.length === 0) {
          throw new Error("No valid games found in the text file");
        }
        
        // Set the game source to "Uploaded Document"
        games.forEach(game => {
          game.source = "Uploaded Document";
        });
        
        uploadMutation.mutate(games);
      } catch (error) {
        toast({
          title: "Error",
          description: `Failed to parse text file: ${error instanceof Error ? error.message : "Unknown error"}`,
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleGenerateRecommendations = () => {
    window.location.href = "/recommendations";
  };

  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-neutral">Upload Schedule</h2>
          <p className="text-gray-600">Upload your MLB schedule to generate betting recommendations</p>
        </div>
      </div>
      
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Upload Schedule File</CardTitle>
          <p className="text-gray-600">Upload a CSV file with today's MLB schedule</p>
        </CardHeader>
        <CardContent>
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors
              ${dragActive ? "border-primary bg-blue-50" : "border-gray-300"}
              ${uploadMutation.isPending ? "opacity-70 pointer-events-none" : ""}
            `}
          >
            <div className="flex flex-col items-center justify-center">
              <Upload className="w-12 h-12 text-gray-400 mb-3" />
              <p className="font-medium mb-1">Drag and drop your file here</p>
              <p className="text-sm text-gray-500 mb-2">or click to browse</p>
              <p className="text-xs text-gray-400">Accepts CSV, Word (.docx), or text files</p>
              <input
                type="file"
                accept=".csv,.docx,.txt,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="hidden"
                id="file-upload"
                onChange={handleFileInput}
                disabled={uploadMutation.isPending || processingFile}
              />
              <label 
                htmlFor="file-upload" 
                className="mt-4 bg-white border border-gray-300 rounded-md px-4 py-2 text-sm cursor-pointer hover:bg-gray-50"
              >
                Browse Files
              </label>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center">
            <Button
              variant="link"
              className="text-primary hover:text-primary-dark text-sm mr-auto"
              onClick={() => downloadTemplate()}
            >
              Download CSV Template
            </Button>
            
            <Button 
              onClick={handleGenerateRecommendations}
              disabled={uploadMutation.isPending}
              className="mt-3 sm:mt-0"
            >
              Generate Recommendations
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li>CSV files: Include team names, start times, and odds in structured format</li>
            <li>Word/Text files: Include game matchups in "Team A vs Team B" format, one per line</li>
            <li>The system supports up to 15 games per day</li>
            <li>For all file types, uploaded games will be marked as from "Uploaded Document"</li>
            <li>For detailed instructions, visit the Help page</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
