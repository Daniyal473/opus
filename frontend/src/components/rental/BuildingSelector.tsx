import { Settings } from 'lucide-react';
import type { Building } from '../../types/rental';

interface BuildingSelectorProps {
    buildings: Building[];
    selectedBuilding: string;
    onBuildingChange: (buildingId: string) => void;
    onAdminPanelClick?: () => void;
}

export function BuildingSelector({ buildings, selectedBuilding, onBuildingChange, onAdminPanelClick }: BuildingSelectorProps) {
    return (
        <div className="building-selector">
            {/* Admin Panel Button */}
            {onAdminPanelClick && (
                <div
                    className="px-4 py-3 text-sm font-medium cursor-pointer hover:bg-blue-50 flex items-center gap-2 bg-blue-50 text-blue-600 border-b border-gray-300"
                    onClick={onAdminPanelClick}
                >
                    <Settings size={18} />
                    <span className="font-semibold">Admin Panel</span>
                </div>
            )}

            <div className="section-header px-4 py-2 bg-gray-100 text-gray-600 font-semibold text-xs uppercase">
                Buildings
            </div>
            {buildings.map((building) => (
                <div
                    key={building.id}
                    className={`building-item px-4 py-2 text-sm font-medium cursor-pointer hover:bg-gray-200 ${selectedBuilding === building.id
                        ? 'active bg-[var(--color-primary)] text-white font-bold'
                        : 'text-[var(--color-dark-text)]'
                        }`}
                    onClick={() => onBuildingChange(building.id)}
                >
                    {building.name}
                </div>
            ))}
        </div>
    );
}
