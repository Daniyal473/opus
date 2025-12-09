import type { Floor } from '../../types/rental';

interface FloorSelectorProps {
    floors: Floor[];
    selectedFloor: string;
    onFloorChange: (floorCode: string) => void;
}

export function FloorSelector({ floors, selectedFloor, onFloorChange }: FloorSelectorProps) {
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
        </div>
    );
}
