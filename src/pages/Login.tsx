import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import toast from "react-hot-toast";

const schema = z.object({
  email: z.string().email("Informe um email válido"),
  senha: z.string().min(6, "A senha precisa ter ao menos 6 caracteres"),
});

type FormValues = z.infer<typeof schema>;

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await login(values.email, values.senha);
      navigate("/dashboard");
    } catch {
      toast.error("Email ou senha inválidos");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md rounded-2xl border border-white/10 bg-surface p-6">
        <h1 className="text-3xl font-heading text-primary">Beta Admin IA</h1>
        <p className="mt-1 text-sm text-white/70">Acesse o painel de gerenciamento de agentes.</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm">Email</label>
            <Input placeholder="admin@betaadminia.com" {...register("email")} />
            {errors.email ? <p className="mt-1 text-xs text-red-400">{errors.email.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm">Senha</label>
            <Input type="password" placeholder="********" {...register("senha")} />
            {errors.senha ? <p className="mt-1 text-xs text-red-400">{errors.senha.message}</p> : null}
          </div>
          <Button className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </div>
      </form>
    </div>
  );
}

