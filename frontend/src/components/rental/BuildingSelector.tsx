import type { Building } from '../../types/rental';

interface BuildingSelectorProps {
    buildings: Building[];
    selectedBuilding: string;
    onBuildingChange: (buildingId: string) => void;
}

export function BuildingSelector({ buildings, selectedBuilding, onBuildingChange }: BuildingSelectorProps) {
    return (
        <div className="py-2 mb-5">
            <div className="px-4 py-2 text-sm font-medium text-gray-500">Buildings</div>
            {buildings.map((building) => (
                <div
                    key={building.id}
                    className={`building-item px-4 py-2 text-sm font-medium cursor-pointer ${selectedBuilding === building.id
                            ? 'active bg-[var(--color-primary)] text-white font-bold'
                            : 'hover:bg-gray-100'
                        }`}
                    onClick={() => onBuildingChange(building.id)}
                >
                    {building.name}
                </div>
            ))}
        </div>
    );
}
