import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreditCard, Loader2 } from "lucide-react";

interface ManageBillingButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

const ManageBillingButton = ({ 
  variant = "outline", 
  size = "default",
  className 
}: ManageBillingButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleManageBilling = async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");

      if (error) throw error;

      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (error: any) {
      console.error("Error opening billing portal:", error);
      toast.error(error.message || "Failed to open billing portal");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleManageBilling}
      variant={variant}
      size={size}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          Manage Billing
        </>
      )}
    </Button>
  );
};

export default ManageBillingButton;
