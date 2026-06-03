import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

const Localizacoes = () => {
  const localizacoes = [
    {
      nome: "Construção Ponte A",
      tipo: "Projeto",
      localizacao: "Porto",
      coordenadas: "41.1579° N, 8.6291° W",
      progresso: 45,
    },
    {
      nome: "Fundações",
      tipo: "Atividade",
      localizacao: "Porto - Zona Industrial",
      coordenadas: "41.1579° N, 8.6291° W",
      progresso: 75,
    },
    {
      nome: "Renovação Edifício B",
      tipo: "Projeto",
      localizacao: "Lisboa",
      coordenadas: "38.7223° N, 9.1393° W",
      progresso: 15,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Localizações</h1>
          <p className="text-muted-foreground">Visualize projetos e atividades no mapa</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Navigation className="h-4 w-4" />
          Ver no Mapa Completo
        </Button>
      </div>

      <Card className="h-96 bg-secondary/20 flex items-center justify-center">
        <div className="text-center space-y-2">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Mapa interativo será implementado aqui</p>
          <p className="text-sm text-muted-foreground">Integração com Google Maps ou Mapbox</p>
        </div>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-4">Todas as Localizações</h2>
        <div className="space-y-3">
          {localizacoes.map((loc, idx) => (
            <Card key={idx} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {loc.nome}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{loc.tipo}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary">{loc.progresso}%</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Localização:</span>
                    <span className="font-medium">{loc.localizacao}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Coordenadas:</span>
                    <span className="font-mono text-xs">{loc.coordenadas}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${loc.progresso}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Localizacoes;