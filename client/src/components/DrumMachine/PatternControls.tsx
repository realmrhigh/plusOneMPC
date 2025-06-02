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
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const PatternControls: React.FC = () => {
  const {
    patterns,
    currentPatternId,
    setCurrentPattern,
    createPattern
  } = useDrumMachineStore();
  
  const isMobile = useIsMobile();
  
  return (
    <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
      <Select
        value={currentPatternId.toString()}
        onValueChange={(value) => setCurrentPattern(parseInt(value))}
      >
        <SelectTrigger className={`${isMobile ? 'w-full' : 'w-[180px]'} bg-red-700 border-red-600 text-white hover:bg-red-600 focus:ring-red-500`}>
          <SelectValue placeholder="Select pattern" />
        </SelectTrigger>
        <SelectContent className="bg-red-800 border-red-600">
          {patterns.map((pattern) => (
            <SelectItem key={pattern.id} value={pattern.id.toString()}>
              {pattern.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button
        variant="outline"
        size="icon"
        onClick={createPattern}
        className="bg-red-700 hover:bg-red-600 border-red-500 text-white"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default PatternControls;
