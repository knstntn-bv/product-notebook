import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Map, Trello, Lightbulb } from "lucide-react";
import StrategyPage from "./StrategyPage";
import RoadmapPage from "./RoadmapPage";
import BoardPage from "./BoardPage";
import HypothesesPage from "./HypothesesPage";

const Index = () => {
  const [activeTab, setActiveTab] = useState("strategy");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">Product Management</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="strategy" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Strategy
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Roadmap
            </TabsTrigger>
            <TabsTrigger value="board" className="flex items-center gap-2">
              <Trello className="h-4 w-4" />
              Board
            </TabsTrigger>
            <TabsTrigger value="hypotheses" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Hypotheses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="strategy">
            <StrategyPage />
          </TabsContent>

          <TabsContent value="roadmap">
            <RoadmapPage />
          </TabsContent>

          <TabsContent value="board">
            <BoardPage />
          </TabsContent>

          <TabsContent value="hypotheses">
            <HypothesesPage />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
