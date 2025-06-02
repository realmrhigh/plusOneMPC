import React from 'react';
import { useDrumMachineStore } from '@/lib/stores/useDrumMachine';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const KitSelector: React.FC = () => {
  const { kits, currentKitId, setCurrentKit } = useDrumMachineStore();
  const isMobile = useIsMobile();
  
  return (
    <div className="w-full sm:w-auto">
      <Select
        value={currentKitId}
        onValueChange={(value) => setCurrentKit(value)}
      >
        <SelectTrigger className={`${isMobile ? 'w-full' : 'w-[180px]'} bg-red-700 border-red-600 text-white hover:bg-red-600 focus:ring-red-500`}>
          <SelectValue placeholder="Select kit" />
        </SelectTrigger>
        <SelectContent className="bg-red-800 border-red-600">
          {kits.map((kit) => (
            <SelectItem key={kit.id} value={kit.id}>
              {kit.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default KitSelector;
