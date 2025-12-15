import { LogOut } from 'lucide-react';
import type { Floor } from '../../types/rental';

interface FloorSelectorProps {
    floors: Floor[];
    selectedFloor: string;
    onFloorChange: (floorCode: string) => void;
    onLogout?: () => void;
}

export function FloorSelector({ floors, selectedFloor, onFloorChange, onLogout }: FloorSelectorProps) {
    return (
        <div className="floor-selector text-[var(--color-dark-text)]">
            {floors.map((floor) => (
                <div
                    key={floor.code}
                    className={`floor-item px-4 py-2 text-sm font-medium cursor-pointer hover:bg-gray-200 ${selectedFloor === floor.code
                        ? 'active bg-[var(--color-light-gray)] border-l-5 border-l-[var(--color-primary)] pl-[10px] font-bold'
                        : ''
                        }`}
                    onClick={() => onFloorChange(floor.code)}
                >
                    {floor.name}
                </div>
            ))}

            {/* Logout Button */}
            {onLogout && (
                <div
                    className="floor-item px-4 py-2 text-sm font-medium cursor-pointer hover:bg-gray-200 flex items-center gap-2 border-t border-gray-300 mt-2"
                    onClick={onLogout}
                >
                    <LogOut size={16} />
                    <span>Logout</span>
                </div>
            )}
        </div>
    );
}
