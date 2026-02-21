import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { PLANS, type PlanKey } from "@/config/plans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Crown,
  Sparkles,
  Zap,
  Loader2,
  Settings,
} from "lucide-react";

const planIcons: Record<PlanKey, React.ReactNode> = {
  free: <Zap className="w-5 h-5" />,
  pro: <Crown className="w-5 h-5" />,
  ai_plus: <Sparkles className="w-5 h-5" />,
};

const Pricing = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { plan: currentPlan, subscribed, createCheckout, openCustomerPortal, loading: subLoading } =
    useSubscription(user?.email ?? undefined);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleCheckout = async (planKey: PlanKey) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const plan = PLANS[planKey];
    if (!plan.price_id) return;

    setCheckoutLoading(planKey);
    try {
      await createCheckout(plan.price_id);
    } catch (err) {
      toast.error("Erro ao iniciar checkout. Tente novamente.");
      console.error(err);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManage = async () => {
    try {
      await openCustomerPortal();
    } catch {
      toast.error("Erro ao abrir portal de gerenciamento.");
    }
  };

  if (authLoading || subLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-3 sm:p-4 border-b-2 border-border bg-card">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/")}
          className="border-2 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Voltar</span>
        </Button>
        <h1 className="text-lg font-bold">Planos</h1>
        <ThemeToggle />
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
            Escolha seu plano
          </h2>
          <p className="text-muted-foreground">
            Comece grátis, evolua quando precisar
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          {(Object.entries(PLANS) as [PlanKey, (typeof PLANS)[PlanKey]][]).map(
            ([key, plan]) => {
              const isCurrentPlan = currentPlan === key;
              const isPopular = key === "pro";

              return (
                <div
                  key={key}
                  className={`relative border-2 p-5 sm:p-6 bg-card flex flex-col overflow-visible ${
                    isPopular
                      ? "border-primary shadow-md"
                      : "border-border"
                  } ${isCurrentPlan ? "ring-2 ring-primary" : ""}`}
                >
                  {isPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      Popular
                    </Badge>
                  )}

                  {isCurrentPlan && (
                    <Badge
                      variant="outline"
                      className="absolute -top-3 right-3 border-primary text-primary z-10 bg-card"
                    >
                      Seu plano
                    </Badge>
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    {planIcons[key]}
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    {plan.description}
                  </p>

                  <div className="mb-6">
                    <span className="text-3xl font-bold">
                      {plan.price === 0
                        ? "Grátis"
                        : `R$ ${plan.price.toFixed(2).replace(".", ",")}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-sm text-muted-foreground">
                        /mês
                      </span>
                    )}
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {"comingSoon" in plan && plan.comingSoon ? (
                    <Button variant="outline" className="w-full border-2" disabled>
                      Em breve
                    </Button>
                  ) : isCurrentPlan && subscribed ? (
                    <Button
                      variant="outline"
                      className="w-full border-2 gap-2"
                      onClick={handleManage}
                    >
                      <Settings className="w-4 h-4" />
                      Gerenciar
                    </Button>
                  ) : isCurrentPlan && !subscribed ? (
                    <Button variant="outline" className="w-full border-2" disabled>
                      Plano atual
                    </Button>
                  ) : plan.price_id ? (
                    <Button
                      className="w-full border-2"
                      variant={isPopular ? "default" : "outline"}
                      disabled={checkoutLoading !== null}
                      onClick={() => handleCheckout(key)}
                    >
                      {checkoutLoading === key ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Assinar"
                      )}
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full border-2" disabled>
                      Plano atual
                    </Button>
                  )}
                </div>
              );
            }
          )}
        </div>

        {subscribed && (
          <div className="mt-8 text-center">
            <Button variant="link" onClick={handleManage} className="gap-2">
              <Settings className="w-4 h-4" />
              Gerenciar assinatura no portal Stripe
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Pricing;
