import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ChangePassword } from '@/components/settings/ChangePassword';
import { ImportExport } from '@/components/settings/ImportExport';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Trash2, Loader2, User, Shield, Palette, Sun, Moon, Lock, HardDrive, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleDeleteAccount = async () => {
    if (confirmText !== 'EXCLUIR') return;

    setDeleting(true);
    try {
      if (!supabase) {
        toast.error('Funcionalidade indisponível no modo offline.');
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada. Faça login novamente.');
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      if (data?.success) {
        await signOut();
        toast.success('Conta excluída com sucesso.');
        navigate('/auth');
      } else {
        throw new Error(data?.error || 'Erro ao excluir conta');
      }
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error.message || 'Erro ao excluir conta. Tente novamente.');
    } finally {
      setDeleting(false);
      setConfirmText('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="glass border-b border-border/50 p-3 sm:p-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="h-9 w-9 p-0 rounded-xl sm:h-auto sm:w-auto sm:px-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Voltar</span>
          </Button>
          <h1 className="text-lg font-semibold flex-1">Configurações</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Account Info */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-5 h-5" />
              Conta
            </CardTitle>
            <CardDescription>Informações da sua conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">E-mail</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Conta criada em</p>
              <p className="font-medium">
                {new Date(user.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="w-5 h-5" />
              Segurança
            </CardTitle>
            <CardDescription>Altere sua senha de acesso</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePassword />
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="w-5 h-5" />
              Aparência
            </CardTitle>
            <CardDescription>Personalize a aparência do app</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Tema</p>
                <p className="text-sm text-muted-foreground">
                  {theme === 'dark' ? 'Modo escuro' : 'Modo claro'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                  className="h-9 w-9 p-0 rounded-xl"
                >
                  <Sun className="w-4 h-4" />
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                  className="h-9 w-9 p-0 rounded-xl"
                >
                  <Moon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data - Import/Export */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="w-5 h-5" />
              Dados
            </CardTitle>
            <CardDescription>
              Exporte suas notas em Markdown ou importe de outro dispositivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImportExport />
          </CardContent>
        </Card>

        {/* Session */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LogOut className="w-5 h-5" />
              Sessão
            </CardTitle>
            <CardDescription>
              Encerre sua sessão atual e saia da conta com segurança
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => signOut()} className="gap-2 rounded-xl">
              <LogOut className="w-4 h-4" />
              Sair da conta
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="shadow-sm border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <Shield className="w-5 h-5" />
              Zona de Perigo
            </CardTitle>
            <CardDescription>
              Ações irreversíveis que afetam sua conta permanentemente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm">Excluir conta</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ao excluir sua conta, todas as suas notas, tags e dados serão
                  permanentemente removidos. Esta ação não pode ser desfeita.
                </p>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2 rounded-xl">
                    <Trash2 className="w-4 h-4" />
                    Excluir minha conta
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <span className="block">
                        Esta ação é <strong>permanente e irreversível</strong>. Todos os
                        seus dados serão excluídos:
                      </span>
                      <span className="block">
                        • Todas as suas notas{'\n'}
                        • Todas as tags{'\n'}
                        • Conexões entre notas{'\n'}
                        • Dados da conta
                      </span>
                      <span className="block mt-3">
                        Digite <strong>EXCLUIR</strong> para confirmar:
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Digite EXCLUIR"
                    className="w-full px-3 py-2 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-destructive/50"
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setConfirmText('')} className="rounded-xl">
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={confirmText !== 'EXCLUIR' || deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Excluindo...
                        </>
                      ) : (
                        'Excluir permanentemente'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;
