import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileText, Map, Trello, Lightbulb, LogOut, User, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ProductProvider, useProduct } from "@/contexts/ProductContext";
import { SettingsDialog } from "@/components/SettingsDialog";
import StrategyPage from "./StrategyPage";
import RoadmapPage from "./RoadmapPage";
import BoardPage from "./BoardPage";
import HypothesesPage from "./HypothesesPage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const IndexContent = () => {
  const [activeTab, setActiveTab] = useState("strategy");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { signOut, user } = useAuth();
  const { isReadOnly } = useProduct();

  return (
    <div className="min-h-screen bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <header className="sticky top-0 z-50 border-b border-border bg-card">
          <div className="container mx-auto px-4 py-2 md:py-4 flex items-center justify-between">
            <h1 className="text-lg md:text-2xl font-bold text-foreground">Product Notebook</h1>
            <div className="flex gap-2">
              {!isReadOnly && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="md:h-10 md:w-auto md:px-4 md:py-2">
                        <Settings className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Settings</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                        Open Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="md:h-10 md:w-auto md:px-4 md:py-2">
                        <User className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Profile</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={signOut}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
          {/* Mobile pages switcher - full width stripe attached to header */}
          <div className="md:hidden border-t border-border">
            <TabsList className="w-full h-auto rounded-none bg-muted p-0 grid grid-cols-4">
              <TabsTrigger value="strategy" className="flex items-center justify-center gap-1.5 rounded-none py-3 text-xs">
                <FileText className="h-3.5 w-3.5" />
                <span>Strategy</span>
              </TabsTrigger>
              <TabsTrigger value="roadmap" className="flex items-center justify-center gap-1.5 rounded-none py-3 text-xs">
                <Map className="h-3.5 w-3.5" />
                <span>Roadmap</span>
              </TabsTrigger>
              <TabsTrigger value="board" className="flex items-center justify-center gap-1.5 rounded-none py-3 text-xs">
                <Trello className="h-3.5 w-3.5" />
                <span>Board</span>
              </TabsTrigger>
              <TabsTrigger value="hypotheses" className="flex items-center justify-center gap-1.5 rounded-none py-3 text-xs">
                <Lightbulb className="h-3.5 w-3.5" />
                <span>Hypotheses</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </header>
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

        <main className="container mx-auto px-4 py-8">
          {/* Desktop pages switcher */}
          <div className="hidden md:block sticky top-[77px] z-40 bg-background pb-4 mb-8">
            <TabsList className="grid w-full grid-cols-4">
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
          </div>

          <TabsContent value="strategy">
            <StrategyPage />
          </TabsContent>

          <TabsContent value="roadmap">
            <RoadmapPage />
          </TabsContent>

          <TabsContent value="board" className="mt-0 -mx-4 -my-8 md:-my-8 h-[calc(100vh-9.5rem)] md:h-[calc(100vh-12.5rem)]">
            <BoardPage />
          </TabsContent>

          <TabsContent value="hypotheses">
            <HypothesesPage />
          </TabsContent>
        </main>
      </Tabs>
    </div>
  );
};

const Index = () => {
  return (
    <ProductProvider>
      <IndexContent />
    </ProductProvider>
  );
};

export default Index;



