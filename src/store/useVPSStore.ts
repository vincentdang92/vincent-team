import { create } from 'zustand';
import { VPS, VPSStatus } from '@prisma/client';

interface VPSStore {
    vpsList: VPS[];
    selectedVPS: VPS | null;
    setVPSList: (vpsList: VPS[]) => void;
    setSelectedVPS: (vps: VPS | null) => void;
    updateVPSStatus: (vpsId: string, status: VPSStatus) => void;
}

export const useVPSStore = create<VPSStore>((set) => ({
    vpsList: [],
    selectedVPS: null,

    setVPSList: (vpsList) => set({ vpsList }),

    setSelectedVPS: (vps) => set({ selectedVPS: vps }),

    updateVPSStatus: (vpsId, status) =>
        set((state) => ({
            vpsList: state.vpsList.map((vps) =>
                vps.id === vpsId ? { ...vps, status } : vps
            ),
            selectedVPS:
                state.selectedVPS?.id === vpsId
                    ? { ...state.selectedVPS, status }
                    : state.selectedVPS,
        })),
}));
