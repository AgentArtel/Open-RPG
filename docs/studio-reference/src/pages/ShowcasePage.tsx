import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { NodeCard } from '@/components/ui-custom/NodeCard';
import { StatCard } from '@/components/ui-custom/StatCard';
import { ActivityItem } from '@/components/ui-custom/ActivityItem';
import { StatusBadge } from '@/components/ui-custom/StatusBadge';
import { CanvasNode } from '@/components/canvas/CanvasNode';
import { ConnectionLine } from '@/components/canvas/ConnectionLine';
import { GridBackground } from '@/components/canvas/GridBackground';
import { ZoomControls } from '@/components/canvas/ZoomControls';
import { NodeSearchPalette } from '@/components/canvas/NodeSearchPalette';
import { Bot, MessageSquare, Database, Globe, Code2, Sparkles, Check, Info, AlertTriangle, X, Plus, Settings, Trash2, Play, RefreshCw, Copy } from 'lucide-react';

const sampleNodes = [
  { id: 'trigger-1', type: 'trigger' as const, position: { x: 50, y: 50 }, title: 'Chat Trigger', subtitle: 'When chat message received', isConfigured: true },
  { id: 'ai-agent-1', type: 'ai-agent' as const, position: { x: 300, y: 50 }, title: 'AI Agent', subtitle: 'Tools Agent', isConfigured: true },
  { id: 'openai-1', type: 'openai-chat' as const, position: { x: 550, y: 50 }, title: 'OpenAI Chat', subtitle: 'gpt-4o-mini', isConfigured: true },
  { id: 'memory-1', type: 'memory' as const, position: { x: 800, y: 50 }, title: 'Postgres Memory', subtitle: 'Chat memory storage', isDeactivated: true },
];

const componentCategories = [
  { id: 'buttons', label: 'Buttons', description: 'Various button styles and states' },
  { id: 'inputs', label: 'Inputs', description: 'Form inputs and controls' },
  { id: 'cards', label: 'Cards', description: 'Card components for content display' },
  { id: 'badges', label: 'Badges & Status', description: 'Status indicators and badges' },
  { id: 'canvas', label: 'Canvas Elements', description: 'Workflow canvas components' },
  { id: 'feedback', label: 'Feedback', description: 'Alerts, dialogs, and notifications' },
  { id: 'data', label: 'Data Display', description: 'Components for displaying data' },
];

export const ShowcasePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('buttons');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [sliderValue, setSliderValue] = useState([50]);
  const [switchChecked, setSwitchChecked] = useState(true);

  return (
    <div className="min-h-screen bg-dark text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Component Showcase</h1>
          <p className="text-white/60">A comprehensive gallery of all UI components in the Open Agent Artel design system.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-dark-100 border border-white/10 p-1 flex flex-wrap h-auto">
            {componentCategories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} className="data-[state=active]:bg-green data-[state=active]:text-dark">{cat.label}</TabsTrigger>
            ))}
          </TabsList>

          {/* Buttons */}
          <TabsContent value="buttons" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-dark-100 border-white/10">
                <CardHeader><CardTitle className="text-white">Button Variants</CardTitle><CardDescription className="text-white/60">Primary, secondary, and ghost button styles</CardDescription></CardHeader>
                <CardContent className="space-y-4"><div className="flex flex-wrap gap-3"><Button>Primary Button</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button><Button variant="outline">Outline</Button></div></CardContent>
              </Card>
              <Card className="bg-dark-100 border-white/10">
                <CardHeader><CardTitle className="text-white">Button Sizes</CardTitle><CardDescription className="text-white/60">Different button sizes</CardDescription></CardHeader>
                <CardContent className="space-y-4"><div className="flex flex-wrap items-center gap-3"><Button size="sm">Small</Button><Button size="default">Default</Button><Button size="lg">Large</Button><Button size="icon"><Plus className="w-4 h-4" /></Button></div></CardContent>
              </Card>
              <Card className="bg-dark-100 border-white/10">
                <CardHeader><CardTitle className="text-white">Button States</CardTitle><CardDescription className="text-white/60">Loading and disabled states</CardDescription></CardHeader>
                <CardContent className="space-y-4"><div className="flex flex-wrap gap-3"><Button disabled>Disabled</Button><Button><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Loading</Button><Button variant="destructive"><Trash2 className="w-4 h-4 mr-2" />Delete</Button></div></CardContent>
              </Card>
              <Card className="bg-dark-100 border-white/10">
                <CardHeader><CardTitle className="text-white">Icon Buttons</CardTitle><CardDescription className="text-white/60">Buttons with icons</CardDescription></CardHeader>
                <CardContent className="space-y-4"><div className="flex flex-wrap gap-3"><Button><Play className="w-4 h-4 mr-2" />Run Workflow</Button><Button variant="secondary"><Settings className="w-4 h-4 mr-2" />Settings</Button><Button variant="outline" size="icon"><Copy className="w-4 h-4" /></Button></div></CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Inputs */}
          <TabsContent value="inputs" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-dark-100 border-white/10">
                <CardHeader><CardTitle className="text-white">Text Inputs</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label>Default Input</Label><Input placeholder="Enter text..." /></div>
                  <div className="space-y-2"><Label>With Value</Label><Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Type something..." /></div>
                  <div className="space-y-2"><Label>Disabled</Label><Input disabled placeholder="Disabled input" /></div>
                </CardContent>
              </Card>
              <Card className="bg-dark-100 border-white/10">
                <CardHeader><CardTitle className="text-white">Select & Controls</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label>Select Dropdown</Label><Select defaultValue="option1"><SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger><SelectContent className="bg-dark-100 border-white/10"><SelectItem value="option1">Option 1</SelectItem><SelectItem value="option2">Option 2</SelectItem><SelectItem value="option3">Option 3</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Slider: {sliderValue[0]}%</Label><Slider value={sliderValue} onValueChange={setSliderValue} max={100} step={1} /></div>
                  <div className="flex items-center space-x-2"><Switch checked={switchChecked} onCheckedChange={setSwitchChecked} /><Label>Toggle Switch</Label></div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cards */}
          <TabsContent value="cards" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-dark-100 border-white/10">
                <CardHeader><CardTitle className="text-white">Basic Card</CardTitle><CardDescription className="text-white/60">A simple card with header and content</CardDescription></CardHeader>
                <CardContent><p className="text-white/70">Cards are used to group related content and actions.</p></CardContent>
              </Card>
              <NodeCard title="AI Agent Node" subtitle="Tools Agent configuration" icon={<Bot className="w-5 h-5" />} isConfigured={true} />
              <NodeCard title="OpenAI Chat" subtitle="gpt-4o-mini" icon={<Sparkles className="w-5 h-5" />} isConfigured={true} onClick={() => setDialogOpen(true)} />
              <StatCard title="Total Executions" value="12,847" change={{ value: 23.5, isPositive: true }} icon={<Play className="w-5 h-5" />} />
              <StatCard title="Active Workflows" value="48" change={{ value: 5.2, isPositive: true }} icon={<Sparkles className="w-5 h-5" />} />
              <StatCard title="Error Rate" value="2.1%" change={{ value: 0.8, isPositive: false }} icon={<AlertTriangle className="w-5 h-5" />} />
            </div>
          </TabsContent>

          {/* Badges */}
          <TabsContent value="badges" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-dark-100 border-white/10">
                <CardHeader><CardTitle className="text-white">Status Badges</CardTitle></CardHeader>
                <CardContent className="space-y-4"><div className="flex flex-wrap gap-3"><StatusBadge status="active" /><StatusBadge status="inactive" /><StatusBadge status="error" /><StatusBadge status="running" /><StatusBadge status="success" /></div></CardContent>
              </Card>
              <Card className="bg-dark-100 border-white/10">
                <CardHeader><CardTitle className="text-white">UI Badges</CardTitle></CardHeader>
                <CardContent className="space-y-4"><div className="flex flex-wrap gap-3"><Badge>Default</Badge><Badge variant="secondary">Secondary</Badge><Badge variant="outline">Outline</Badge><Badge className="bg-green text-dark">Success</Badge><Badge className="bg-danger text-white">Error</Badge></div></CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Canvas */}
          <TabsContent value="canvas" className="space-y-6">
            <div className="space-y-6">
              <Card className="bg-dark-100 border-white/10">
                <CardHeader><CardTitle className="text-white">Canvas Nodes</CardTitle><CardDescription className="text-white/60">Interactive workflow nodes with ports</CardDescription></CardHeader>
                <CardContent>
                  <div className="relative h-64 bg-dark rounded-lg overflow-hidden border border-white/10">
                    <GridBackground />
                    <div className="absolute inset-0 p-8 flex gap-8 flex-wrap items-start">
                      {sampleNodes.map((node) => (
                        <div key={node.id} className="relative w-[220px] min-h-[140px] flex-shrink-0">
                          <CanvasNode data={{ ...node, position: { x: 0, y: 0 } }} onClick={() => {}} />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-dark-100 border-white/10">
                <CardHeader><CardTitle className="text-white">Connection Lines</CardTitle><CardDescription className="text-white/60">Bezier curves connecting nodes</CardDescription></CardHeader>
                <CardContent>
                  <div className="relative h-40 bg-dark rounded-lg overflow-hidden border border-white/10">
                    <svg className="absolute inset-0 w-full h-full">
                      <ConnectionLine connection={{ id: 'demo-1', from: 'a', to: 'b', fromPort: 'output', toPort: 'input' }} fromPos={{ x: 50, y: 80 }} toPos={{ x: 300, y: 80 }} />
                      <ConnectionLine connection={{ id: 'demo-2', from: 'a', to: 'b', fromPort: 'output', toPort: 'input' }} fromPos={{ x: 350, y: 80 }} toPos={{ x: 600, y: 80 }} isSelected={true} label="1 item" />
                    </svg>
                  </div>
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-dark-100 border-white/10">
                  <CardHeader><CardTitle className="text-white">Node Search Palette</CardTitle></CardHeader>
                  <CardContent>
                    <Button onClick={() => setPaletteOpen(true)}>Open Palette</Button>
                    <NodeSearchPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} onSelectNode={() => setPaletteOpen(false)} />
                  </CardContent>
                </Card>
                <Card className="bg-dark-100 border-white/10">
                  <CardHeader><CardTitle className="text-white">Zoom Controls</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <ZoomControls scale={1} onZoomIn={() => {}} onZoomOut={() => {}} onFitToView={() => {}} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Feedback */}
          <TabsContent value="feedback" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-dark-100 border-white/10">
                <CardHeader><CardTitle className="text-white">Alerts</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Alert><Info className="w-4 h-4" /><AlertTitle>Information</AlertTitle><AlertDescription>This is an informational alert message.</AlertDescription></Alert>
                  <Alert className="border-green/30 bg-green/10"><Check className="w-4 h-4 text-green" /><AlertTitle className="text-green">Success</AlertTitle><AlertDescription className="text-green/80">Operation completed successfully.</AlertDescription></Alert>
                  <Alert className="border-danger/30 bg-danger/10"><AlertTriangle className="w-4 h-4 text-danger" /><AlertTitle className="text-danger">Error</AlertTitle><AlertDescription className="text-danger/80">Something went wrong. Please try again.</AlertDescription></Alert>
                </CardContent>
              </Card>
              <Card className="bg-dark-100 border-white/10">
                <CardHeader><CardTitle className="text-white">Dialog</CardTitle></CardHeader>
                <CardContent>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild><Button>Open Dialog</Button></DialogTrigger>
                    <DialogContent className="bg-dark-100 border-white/10">
                      <DialogHeader><DialogTitle className="text-white">Example Dialog</DialogTitle><DialogDescription className="text-white/60">This is a dialog component with a title and description.</DialogDescription></DialogHeader>
                      <div className="space-y-4 pt-4">
                        <p className="text-white/70">Dialogs are used for important information that requires user attention or action.</p>
                        <div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={() => setDialogOpen(false)}>Confirm</Button></div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
              <Card className="bg-dark-100 border-white/10">
                <CardHeader><CardTitle className="text-white">Tooltips</CardTitle></CardHeader>
                <CardContent>
                  <TooltipProvider>
                    <div className="flex gap-4">
                      <Tooltip><TooltipTrigger asChild><Button variant="outline">Hover me</Button></TooltipTrigger><TooltipContent><p>This is a tooltip</p></TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon"><Info className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent side="right"><p>More information here</p></TooltipContent></Tooltip>
                    </div>
                  </TooltipProvider>
                </CardContent>
              </Card>
              <Card className="bg-dark-100 border-white/10">
                <CardHeader><CardTitle className="text-white">Accordion</CardTitle></CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1" className="border-white/10"><AccordionTrigger>Section 1</AccordionTrigger><AccordionContent>Content for section 1 goes here.</AccordionContent></AccordionItem>
                    <AccordionItem value="item-2" className="border-white/10"><AccordionTrigger>Section 2</AccordionTrigger><AccordionContent>Content for section 2 goes here.</AccordionContent></AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Data Display */}
          <TabsContent value="data" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-dark-100 border-white/10">
                <CardHeader><CardTitle className="text-white">Activity Items</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ActivityItem title="Workflow Executed" description="AI Agent Workflow completed successfully" timestamp="2 minutes ago" icon={<Check className="w-4 h-4" />} iconClassName="bg-green/20 text-green" />
                  <ActivityItem title="Node Added" description="OpenAI Chat node was added to the workflow" timestamp="15 minutes ago" icon={<Plus className="w-4 h-4" />} iconClassName="bg-blue/20 text-blue" />
                  <ActivityItem title="Execution Failed" description="Memory connection timeout" timestamp="1 hour ago" icon={<X className="w-4 h-4" />} iconClassName="bg-danger/20 text-danger" />
                </CardContent>
              </Card>
              <Card className="bg-dark-100 border-white/10">
                <CardHeader><CardTitle className="text-white">Node Type Icons</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { icon: <Bot className="w-6 h-6 text-green" />, bg: 'bg-green/20', label: 'AI Agent' },
                      { icon: <MessageSquare className="w-6 h-6 text-blue" />, bg: 'bg-blue/20', label: 'Trigger' },
                      { icon: <Database className="w-6 h-6 text-purple" />, bg: 'bg-purple/20', label: 'Memory' },
                      { icon: <Globe className="w-6 h-6 text-cyan" />, bg: 'bg-cyan/20', label: 'HTTP' },
                      { icon: <Code2 className="w-6 h-6 text-yellow" />, bg: 'bg-yellow/20', label: 'Code' },
                      { icon: <Sparkles className="w-6 h-6 text-green" />, bg: 'bg-green/20', label: 'OpenAI' },
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center`}>{item.icon}</div>
                        <span className="text-xs text-white/60">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
