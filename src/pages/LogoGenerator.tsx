import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";

const LogoGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const generateLogo = async () => {
    setIsGenerating(true);
    setLogoUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-logo', {
        body: {}
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.imageUrl) {
        setLogoUrl(data.imageUrl);
        toast({
          title: "Logo Generated!",
          description: "Your SnapDaddy logo has been created. Download it below.",
        });
      } else {
        throw new Error('No image URL returned');
      }
    } catch (error: any) {
      console.error('Error generating logo:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadLogo = () => {
    if (!logoUrl) return;

    const link = document.createElement('a');
    link.href = logoUrl;
    link.download = 'snapdaddy-logo.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Downloaded!",
      description: "Logo saved to your downloads folder.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6"
          >
            ← Back to Home
          </Button>

          <Card className="shadow-2xl border-primary/20">
            <CardHeader className="space-y-1">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                SnapDaddy Logo Generator
              </CardTitle>
              <CardDescription className="text-base">
                Generate a professional AI-powered logo for SnapDaddy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This tool uses AI to generate a unique logo matching the SnapDaddy brand: 
                  purple gradient colors, receipt icon theme, modern and clean design.
                </p>

                <Button
                  onClick={generateLogo}
                  disabled={isGenerating}
                  size="lg"
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating Logo...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Generate Logo with AI
                    </>
                  )}
                </Button>
              </div>

              {logoUrl && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="rounded-lg border-2 border-primary/20 p-6 bg-gradient-to-br from-background to-primary/5">
                    <div className="flex justify-center">
                      <img
                        src={logoUrl}
                        alt="Generated SnapDaddy Logo"
                        className="max-w-full h-auto rounded-lg shadow-xl"
                        style={{ maxHeight: '400px' }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={downloadLogo}
                      size="lg"
                      className="flex-1"
                    >
                      <Download className="mr-2 h-5 w-5" />
                      Download Logo
                    </Button>
                    <Button
                      onClick={generateLogo}
                      variant="outline"
                      size="lg"
                      className="flex-1"
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      Generate New One
                    </Button>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-2 pt-4 border-t">
                    <p className="font-semibold">Next Steps:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Download the logo using the button above</li>
                      <li>Save it as <code className="bg-muted px-1 py-0.5 rounded">logo.png</code> in your project</li>
                      <li>Update the favicon and landing page to use this logo</li>
                    </ol>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default LogoGenerator;
