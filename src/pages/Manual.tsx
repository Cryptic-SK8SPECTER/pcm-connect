import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, BookOpen, Play } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useTranslations } from "@/hooks/useTranslations";
const Manual = () => {
  const t = useTranslations();
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.manual.title}</h1>
          <p className="text-muted-foreground mt-1">{t.manual.subtitle}</p>
        </div>
        <div className="flex gap-2">
          
          
        </div>
      </div>

      <Card className="bg-gradient-to-r from-accent/30 to-accent/10 border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t.manual.welcome}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t.manual.welcomeDescription}
          </p>
          
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.manual.index}</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>{t.manual.section1}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    <strong>{t.manual.section1_1}</strong> {t.manual.section1_1_content}
                  </p>
                  <p>
                    <strong>{t.manual.section1_2}</strong>
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>{t.manual.feature1}</li>
                    <li>{t.manual.feature2}</li>
                    <li>{t.manual.feature3}</li>
                    <li>{t.manual.feature4}</li>
                    <li>{t.manual.feature5}</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>{t.manual.section2}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    <strong>{t.manual.section2_1}</strong>
                  </p>
                  <ol className="list-decimal list-inside ml-4 space-y-1">
                    <li>{t.manual.step2_1}</li>
                    <li>{t.manual.step2_2}</li>
                    <li>{t.manual.step2_3}</li>
                    <li>{t.manual.step2_4}</li>
                    <li>{t.manual.step2_5}</li>
                    <li>{t.manual.step2_6}</li>
                    <li>{t.manual.step2_7}</li>
                  </ol>
                  <p className="mt-3">
                    <strong>{t.manual.section2_2}</strong> {t.manual.section2_2_content}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>{t.manual.section3}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    <strong>{t.manual.section3_1}</strong>
                  </p>
                  <ol className="list-decimal list-inside ml-4 space-y-1">
                    <li>{t.manual.step3_1}</li>
                    <li>{t.manual.step3_2}</li>
                    <li>{t.manual.step3_3}</li>
                    <li>{t.manual.step3_4}</li>
                    <li>{t.manual.step3_5}</li>
                    <li>{t.manual.step3_6}</li>
                    <li>{t.manual.step3_7}</li>
                  </ol>
                  <p className="mt-3">
                    <strong>{t.manual.section3_2}</strong> {t.manual.section3_2_content}
                  </p>
                  <p className="mt-3">
                    <strong>{t.manual.section3_3}</strong> {t.manual.section3_3_content}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>{t.manual.section4}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    <strong>{t.manual.section4_1}</strong> {t.manual.section4_1_content}
                  </p>
                  <p>
                    <strong>{t.manual.section4_2}</strong>
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li><strong>{t.manual.role1}</strong> {t.manual.role1_desc}</li>
                    <li><strong>{t.manual.role2}</strong> {t.manual.role2_desc}</li>
                    <li><strong>{t.manual.role3}</strong> {t.manual.role3_desc}</li>
                    <li><strong>{t.manual.role4}</strong> {t.manual.role4_desc}</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger>{t.manual.section5}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    <strong>{t.manual.section5_1}</strong> {t.manual.section5_1_content}
                  </p>
                  <p>
                    <strong>{t.manual.section5_2}</strong> {t.manual.section5_2_content}
                  </p>
                  <p>
                    <strong>{t.manual.section5_3}</strong> {t.manual.section5_3_content}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger>{t.manual.section6}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    <strong>{t.manual.section6_1}</strong> {t.manual.section6_1_content}
                  </p>
                  <p>
                    <strong>{t.manual.section6_2}</strong> {t.manual.section6_2_content}
                  </p>
                  <p>
                    <strong>{t.manual.section6_3}</strong> {t.manual.section6_3_content}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7">
              <AccordionTrigger>{t.manual.section7}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    {t.manual.section7_content}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8">
              <AccordionTrigger>{t.manual.section8}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    {t.manual.section8_content}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.manual.supportTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t.manual.supportDescription}
          </p>
          <p className="text-sm">
            <strong>{t.manual.email}</strong> suporte@pcm-connect.co.mz
          </p>
          <p className="text-sm">
            <strong>{t.manual.phone}</strong> 258842355005
          </p>
        </CardContent>
      </Card>
    </div>;
};
export default Manual;