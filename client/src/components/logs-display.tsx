import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Calendar, InfoIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function LogsDisplay() {
  const { data: latestExport, isLoading, error } = useQuery({
    queryKey: ["/api/exports/latest"],
  });

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-neutral">Google Sheets Log</h2>
            <p className="text-gray-600">View and access your exported betting data</p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Export History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-start mb-3">
                <span className="text-gray-600 mr-2">Last export:</span>
                <Skeleton className="h-5 w-48" />
              </div>
              
              <Skeleton className="h-9 w-40" />
            </div>
            
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-neutral">Google Sheets Log</h2>
          <p className="text-gray-600">View and access your exported betting data</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Export History</CardTitle>
        </CardHeader>
        <CardContent>
          {error || !latestExport ? (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-2">No export history found.</p>
              <p className="text-gray-500 mb-4">Generate recommendations and export them to Google Sheets to get started.</p>
              <Button onClick={() => window.location.href = "/recommendations"}>
                Go to Recommendations
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex items-start mb-3">
                  <span className="text-gray-600 mr-2">Last export:</span>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-500 mr-1" />
                    <span className="text-gray-800">
                      {format(new Date(latestExport.exportDate), "M/d/yyyy, p")}
                    </span>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="inline-flex items-center"
                  onClick={() => window.open(latestExport.sheetUrl, "_blank")}
                >
                  Open Google Sheet
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                <div className="flex">
                  <InfoIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      Tip: Your Google Sheet contains all historical exports and performance tracking.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
