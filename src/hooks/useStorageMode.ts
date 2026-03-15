import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { migrateLocalToCloud, pullCloudToLocal } from '@/lib/migrationService';
import { toast } from 'sonner';

const ADMIN_EMAIL = 'duartegustavoh@gmail.com';
const FREE_CLOUD_LIMIT = 20;

export function useStorageMode() {
  const { user } = useAuth();
  const { plan, loading: subLoading } = useSubscription(user?.email ?? undefined);

  const isAdmin = user?.email === ADMIN_EMAIL;

  // Use cached mode during subscription loading to avoid flicker
  const cachedMode = user ? localStorage.getItem(`gn_mode_${user.id}`) : null;

  const isPaid = plan !== 'free';
  const useCloud = isAdmin || isPaid;

  const [migrationInProgress, setMigrationInProgress] = useState(false);

  // Track previous cloud mode to detect upgrades/downgrades
  const prevUseCloudRef = useRef<boolean | null>(null);
  const hasMigratedRef = useRef(false);

  useEffect(() => {
    if (!subLoading && user) {
      localStorage.setItem(`gn_mode_${user.id}`, useCloud ? 'cloud' : 'local');
    }
  }, [subLoading, user, useCloud]);

  // Detect upgrade/downgrade and trigger migration
  useEffect(() => {
    if (subLoading || !user || hasMigratedRef.current) return;

    const prev = prevUseCloudRef.current;
    prevUseCloudRef.current = useCloud;

    // Only trigger on actual transitions (not initial load)
    if (prev === null) return;
    if (prev === useCloud) return;

    hasMigratedRef.current = true;

    if (!prev && useCloud) {
      // UPGRADE: local → cloud
      setMigrationInProgress(true);
      toast.info('Migrando notas para a nuvem...');
      migrateLocalToCloud(user.id)
        .then(({ migrated, errors }) => {
          if (errors > 0) {
            toast.warning(`Migração parcial: ${migrated} notas enviadas, ${errors} erros`);
          } else if (migrated > 0) {
            toast.success(`${migrated} notas migradas para a nuvem!`);
          }
        })
        .catch(err => {
          console.error('[Migration] Upgrade migration failed:', err);
          toast.error('Erro ao migrar notas para a nuvem');
        })
        .finally(() => setMigrationInProgress(false));
    } else if (prev && !useCloud) {
      // DOWNGRADE: cloud → local
      setMigrationInProgress(true);
      toast.info('Baixando notas da nuvem...');
      pullCloudToLocal(user.id)
        .then(({ pulled }) => {
          if (pulled > 0) {
            toast.success(`${pulled} notas salvas localmente!`);
          }
        })
        .catch(err => {
          console.error('[Migration] Downgrade migration failed:', err);
          toast.error('Erro ao baixar notas da nuvem');
        })
        .finally(() => setMigrationInProgress(false));
    }
  }, [subLoading, user, useCloud]);

  const resolvedUseCloud = subLoading
    ? (cachedMode === 'cloud' || isAdmin)
    : useCloud;

  return {
    isAdmin,
    isPaid: subLoading ? cachedMode === 'cloud' : isPaid,
    useCloud: resolvedUseCloud,
    cloudNoteLimit: resolvedUseCloud ? Infinity : FREE_CLOUD_LIMIT,
    loading: subLoading && !cachedMode && !isAdmin,
    migrationInProgress,
  };
}
