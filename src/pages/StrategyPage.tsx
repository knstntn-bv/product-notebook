import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Plus, Trash2 } from "lucide-react";

interface Metric {
  id: string;
  name: string;
  parentMetricId?: string;
}

interface Track {
  id: string;
  name: string;
  description: string;
}

const StrategyPage = () => {
  const [productFormula, setProductFormula] = useState("");
  const [isEditingFormula, setIsEditingFormula] = useState(false);
  
  const [values, setValues] = useState<string[]>([]);
  const [editingValueIndex, setEditingValueIndex] = useState<number | null>(null);
  
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);

  const addValue = () => {
    setValues([...values, ""]);
    setEditingValueIndex(values.length);
  };

  const updateValue = (index: number, value: string) => {
    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);
  };

  const deleteValue = (index: number) => {
    setValues(values.filter((_, i) => i !== index));
  };

  const addMetric = () => {
    setMetrics([...metrics, { id: `metric-${Date.now()}`, name: "", parentMetricId: undefined }]);
  };

  const updateMetric = (id: string, field: keyof Metric, value: string) => {
    setMetrics(metrics.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const deleteMetric = (id: string) => {
    setMetrics(metrics.filter(m => m.id !== id));
  };

  const addTrack = () => {
    setTracks([...tracks, { id: `track-${Date.now()}`, name: "", description: "" }]);
  };

  const updateTrack = (id: string, field: keyof Track, value: string) => {
    setTracks(tracks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const deleteTrack = (id: string) => {
    setTracks(tracks.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Product Formula */}
      <Card>
        <CardHeader>
          <CardTitle>Product Formula</CardTitle>
          <CardDescription>Define your product's core formula</CardDescription>
        </CardHeader>
        <CardContent>
          {isEditingFormula ? (
            <div className="space-y-2">
              <Input
                value={productFormula}
                onChange={(e) => setProductFormula(e.target.value)}
                maxLength={500}
                placeholder="Enter product formula..."
              />
              <Button onClick={() => setIsEditingFormula(false)} size="sm">
                Save
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-foreground">{productFormula || "Click edit to add product formula"}</p>
              <Button variant="ghost" size="sm" onClick={() => setIsEditingFormula(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Values */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Values</CardTitle>
              <CardDescription>Define your product values</CardDescription>
            </div>
            <Button onClick={addValue} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Value
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {values.map((value, index) => (
            <div key={index} className="flex gap-2">
              {editingValueIndex === index ? (
                <>
                  <Textarea
                    value={value}
                    onChange={(e) => updateValue(index, e.target.value)}
                    maxLength={1000}
                    placeholder="Enter value..."
                    className="flex-1"
                  />
                  <Button onClick={() => setEditingValueIndex(null)} size="sm">
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <p className="flex-1 text-foreground">{value || "Click edit to add value"}</p>
                  <Button variant="ghost" size="sm" onClick={() => setEditingValueIndex(index)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteValue(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Metrics Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Metrics</CardTitle>
              <CardDescription>Define your product metrics hierarchy</CardDescription>
            </div>
            <Button onClick={addMetric} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Metric
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Parent Metric</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((metric) => (
                <TableRow key={metric.id}>
                  <TableCell>
                    <Input
                      value={metric.name}
                      onChange={(e) => updateMetric(metric.id, "name", e.target.value)}
                      maxLength={100}
                      placeholder="Enter metric name..."
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={metric.parentMetricId || "none"}
                      onValueChange={(value) => updateMetric(metric.id, "parentMetricId", value === "none" ? "" : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent metric" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {metrics.filter(m => m.id !== metric.id).map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name || "Unnamed Metric"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => deleteMetric(metric.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tracks Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tracks</CardTitle>
              <CardDescription>Define your product tracks</CardDescription>
            </div>
            <Button onClick={addTrack} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Track
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Track</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracks.map((track) => (
                <TableRow key={track.id}>
                  <TableCell>
                    <Input
                      value={track.name}
                      onChange={(e) => updateTrack(track.id, "name", e.target.value)}
                      maxLength={100}
                      placeholder="Enter track name..."
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={track.description}
                      onChange={(e) => updateTrack(track.id, "description", e.target.value)}
                      maxLength={500}
                      placeholder="Enter description..."
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => deleteTrack(track.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StrategyPage;
