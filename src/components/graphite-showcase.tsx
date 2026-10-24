"use client";

import { Fragment, useState, type ReactNode } from "react";
import Link from "next/link";
import { CopyButtonDemo } from "@/components/component-demos/copy-button-demo";
import {
  ArrowUpRightIcon,
  CheckIcon,
  DownloadSimpleIcon,
  FunnelIcon,
  DotsThreeIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import source from "../../docs/graphite/source.json";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToastProvider, ToastViewport, useToastManager } from "@/components/ui/toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const sections = [
  ["animated-components", "Animated components"],
  ["foundations", "Foundations"],
  ["typography", "Typography & layout"],
  ["actions", "Actions & forms"],
  ["content", "Content patterns"],
  ["controls", "Form controls"],
  ["overlays", "Overlays"],
  ["navigation", "Navigation"],
  ["feedback", "Feedback"],
];

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="graphite-section">
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </section>
  );
}

function Specimen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="graphite-specimen">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function GraphiteShowcase() {
  return (
    <ToastProvider timeout={5000} limit={1}>
      <ComponentExamples />
      <ToastViewport />
    </ToastProvider>
  );
}

function ComponentExamples() {
  const toastManager = useToastManager();
  const [attribution, setAttribution] = useState("last");
  const [funnelName, setFunnelName] = useState("Website conversion");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [savedFunnel, setSavedFunnel] = useState("");
  const [excludeInternal, setExcludeInternal] = useState(true);
  const [draftExcludeInternal, setDraftExcludeInternal] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [period, setPeriod] = useState("30");
  const [draftPeriod, setDraftPeriod] = useState("30");
  const [popoverOpen, setPopoverOpen] = useState(false);

  function notify(message: string) {
    toastManager.add({ id: "demo-notification", title: "Demo updated", description: message });
  }

  return (
    <>
      <TooltipProvider delay={200}>
        <div className="graphite-showcase">
          <header>
            <p className="graphite-eyebrow">Kousa / Vega components</p>
            <h1>Components</h1>
            <p className="graphite-intro">
              A quiet foundation for understanding your audience. Explore traffic, visitor journeys, funnels,
              and revenue attribution through 21 reusable components.
            </p>
            <nav aria-label="Design system sections" className="graphite-index">
              {sections.map(([id, title]) => (
                <a key={id} href={`#${id}`}>
                  {title}
                </a>
              ))}
            </nav>
            <p className="graphite-notice">
              Base UI interactions, compact controls, and Phosphor icons. Vega components use the Graphite
              palette in both light and dark themes.
            </p>
          </header>

          <Section
            id="animated-components"
            title="Animated components"
            description="Small interactions built with Motion. Each component includes a live demo and editable source."
          >
            <Specimen title="Copy Button">
              <CopyButtonDemo />
              <Link
                href="/components/copy-button"
                className="mt-4 inline-flex items-center gap-1 text-sm underline underline-offset-4"
              >
                Copy Button documentation <ArrowUpRightIcon aria-hidden="true" />
              </Link>
            </Specimen>
          </Section>

          <Section
            id="foundations"
            title="01 / Foundations"
            description="Graphite surfaces, thin borders, restrained status colors. The source palette below stays constant when you switch the application theme."
          >
            <div className="graphite-swatches">
              {source.tokens
                .filter((token) => token.name.startsWith("--color-"))
                .map((token) => (
                  <figure key={token.name} className="graphite-swatch">
                    <div style={{ backgroundColor: token.value }} />
                    <figcaption>
                      {token.name.slice(8)}
                      <code>{token.value}</code>
                    </figcaption>
                  </figure>
                ))}
            </div>
            <details className="graphite-tokens">
              <summary>All 66 design tokens / 11 namespaces</summary>
              <dl className="graphite-token-list">
                {source.tokens.map((token) => (
                  <Fragment key={token.name}>
                    <dt>{token.name}</dt>
                    <dd>{token.value}</dd>
                  </Fragment>
                ))}
              </dl>
            </details>
          </Section>

          <Section
            id="typography"
            title="02 / Typography & layout"
            description="Stack Sans Notch for headings. Inter for content, buttons, and form labels. DM Mono for code and commands."
          >
            <div className="graphite-grid">
              <Specimen title="Heading scale / 400 and 500">
                <p
                  className="graphite-type-sample"
                  style={{ fontSize: "clamp(32px, 5vw, 64px)", lineHeight: 1.0625 }}
                >
                  Know your audience.
                </p>
                <p
                  className="graphite-type-sample"
                  style={{ fontSize: 32, lineHeight: "40px", fontWeight: 500 }}
                >
                  Every journey tells a story.
                </p>
                <p className="graphite-type-sample" style={{ fontSize: 24, lineHeight: "32px" }}>
                  From first visit to conversion.
                </p>
                <span className="graphite-caption">
                  Headings use the supplied local −0.025em override. The tight tracking token remains −0.04em.
                </span>
              </Specimen>
              <Specimen title="Body, labels, and code">
                <p style={{ fontSize: 18, lineHeight: "28px", margin: 0 }}>
                  Connect traffic to outcomes with Kousa.
                </p>
                <p style={{ fontSize: 16, lineHeight: "24px", margin: 0 }}>
                  Follow visitor journeys, find funnel drop-offs, and understand which channels drive revenue.
                </p>
                <p style={{ fontWeight: 500, margin: 0 }}>14px / Inter medium / Form labels</p>
                <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>
                  12px / Inter semibold / Supporting metadata
                </p>
                <pre className="graphite-code">
                  <code>
                    <span className="graphite-keyword">await</span>
                    {" kousa."}
                    <span className="graphite-function">track</span>
                    {"("}
                    <span className="graphite-string">{'"purchase"'}</span>
                    {", {\n  revenue: 149,\n  currency: "}
                    <span className="graphite-string">{'"USD"'}</span>
                    {"\n});"}
                  </code>
                </pre>
              </Specimen>
            </div>
            <p className="graphite-caption mt-8">
              4px spacing base · 4 / 6 / 12px component radii · 640 / 1120 / 1280px containers · 640 / 768 /
              1024 / 1440px breakpoints
            </p>
          </Section>

          <Section
            id="actions"
            title="03 / Actions & forms"
            description="Rounded controls with clear labels, visible focus, and useful validation. Buttons use Inter 14px labels, with 44px touch targets on mobile."
          >
            <div className="graphite-stack">
              <Specimen title="Button / variants">
                <div className="graphite-row">
                  <Button onClick={() => notify("Demo report created.")}>
                    <PlusIcon aria-hidden="true" />
                    Create report
                  </Button>
                  <Button variant="secondary" onClick={() => notify("Demo report saved.")}>
                    Save report
                  </Button>
                  <Button variant="outline" onClick={() => notify("Demo export prepared.")}>
                    <DownloadSimpleIcon aria-hidden="true" />
                    Export
                  </Button>
                  <Button variant="ghost" onClick={() => notify("Demo action cancelled.")}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={() => notify("Demo segment removed.")}>
                    Delete segment
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label="Add demo segment"
                    onClick={() => notify("Demo segment added.")}
                  >
                    <PlusIcon aria-hidden="true" />
                  </Button>
                </div>
              </Specimen>
              <Specimen title="Button / default, hover, focus, disabled, loading">
                <div className="graphite-row">
                  <Button onClick={() => notify("Default state selected.")}>Default</Button>
                  <Button data-preview-state="hover" onClick={() => notify("Hover specimen selected.")}>
                    Hover
                  </Button>
                  <Button data-preview-state="focus" onClick={() => notify("Focus specimen selected.")}>
                    Focus
                  </Button>
                  <Button disabled>Disabled</Button>
                  <Button disabled aria-busy="true">
                    <Spinner />
                    Exporting
                  </Button>
                </div>
              </Specimen>
              <div className="graphite-grid">
                <Specimen title="Input & Label">
                  <div className="graphite-field">
                    <Label htmlFor="site-domain">Website domain</Label>
                    <Input id="site-domain" placeholder="kousa.io" autoComplete="url" />
                    <small>Enter the domain you want to measure.</small>
                  </div>
                  <div className="graphite-field">
                    <Label htmlFor="site-name">Website name</Label>
                    <Input id="site-name" defaultValue="Kousa marketing" />
                  </div>
                  <div className="graphite-field">
                    <Label htmlFor="invalid-domain">Domain / invalid specimen</Label>
                    <Input
                      id="invalid-domain"
                      defaultValue="https://"
                      aria-invalid="true"
                      aria-describedby="domain-error"
                    />
                    <small id="domain-error" data-error>
                      Enter a domain such as kousa.io.
                    </small>
                  </div>
                  <div className="graphite-field">
                    <Label htmlFor="readonly-domain">Managed domain / disabled</Label>
                    <Input id="readonly-domain" value="app.kousa.io" disabled />
                  </div>
                </Specimen>
                <Specimen title="Textarea">
                  <div className="graphite-field">
                    <Label htmlFor="report-description">Report description</Label>
                    <Textarea
                      id="report-description"
                      placeholder="What should this report help your team understand?"
                      aria-describedby="description-hint"
                    />
                    <small id="description-hint">Add context about this funnel or visitor segment.</small>
                  </div>
                  <div className="graphite-field">
                    <Label htmlFor="locked-notes">Archived report notes</Label>
                    <Textarea
                      id="locked-notes"
                      defaultValue="Quarterly traffic and revenue review."
                      disabled
                    />
                  </div>
                </Specimen>
              </div>
            </div>
          </Section>

          <Section
            id="content"
            title="04 / Content patterns"
            description="Flat surfaces, 24px card padding, and compact status indicators."
          >
            <div className="graphite-grid">
              <Specimen title="Card">
                <Card>
                  <CardHeader>
                    <div className="graphite-row">
                      <CardTitle>Total visitors</CardTitle>
                      <Badge variant="success">Live</Badge>
                    </div>
                    <CardDescription>Unique visitors across your website.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="graphite-metric">24,892</p>
                    <p className="graphite-caption">+12.8% compared with the previous 30 days</p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" onClick={() => notify("Traffic report selected in this demo.")}>
                      View traffic
                      <ArrowUpRightIcon aria-hidden="true" />
                    </Button>
                  </CardFooter>
                </Card>
              </Specimen>
              <div className="graphite-stack">
                <Specimen title="Badge / variants">
                  <div className="graphite-row">
                    <Badge>All visitors</Badge>
                    <Badge variant="secondary">Organic</Badge>
                    <Badge variant="outline">Referral</Badge>
                    <Badge variant="success">Connected</Badge>
                    <Badge variant="warning">Delayed</Badge>
                    <Badge variant="destructive">Disconnected</Badge>
                    <span className="graphite-row">
                      <Badge variant="dot" aria-hidden="true" />
                      Live traffic
                    </span>
                  </div>
                </Specimen>
                <Specimen title="Separator / horizontal and vertical">
                  <div className="graphite-row">
                    <span>Visitors</span>
                    <Separator orientation="vertical" decorative={false} />
                    <span>Journeys</span>
                    <Separator orientation="vertical" />
                    <span>Revenue</span>
                  </div>
                  <Separator decorative={false} />
                  <span className="graphite-caption">One-pixel rules separate related content.</span>
                </Specimen>
              </div>
            </div>
          </Section>

          <Section
            id="controls"
            title="05 / Form controls"
            description="16px checkbox and radio glyphs, a 32 × 18.4px switch, and interaction targets of at least 44px."
          >
            <div className="graphite-grid">
              <Specimen title="Checkbox">
                <Label className="graphite-choice">
                  <Checkbox defaultChecked />
                  Track page views
                </Label>
                <Label className="graphite-choice">
                  <Checkbox />
                  Track outbound links
                </Label>
                <Label className="graphite-choice">
                  <Checkbox disabled />
                  Track archived website
                </Label>
                <Label className="graphite-choice">
                  <Checkbox disabled defaultChecked />
                  Required privacy setting
                </Label>
              </Specimen>
              <Specimen title="Radio Group">
                <RadioGroup>
                  <legend className="ui-label">Revenue attribution model</legend>
                  <Label className="graphite-choice">
                    <RadioGroupItem
                      name="attribution"
                      value="last"
                      checked={attribution === "last"}
                      onChange={() => setAttribution("last")}
                    />
                    Last touch
                  </Label>
                  <Label className="graphite-choice">
                    <RadioGroupItem
                      name="attribution"
                      value="first"
                      checked={attribution === "first"}
                      onChange={() => setAttribution("first")}
                    />
                    First touch
                  </Label>
                  <Label className="graphite-choice">
                    <RadioGroupItem name="attribution" value="linear" disabled />
                    Linear / unavailable
                  </Label>
                </RadioGroup>
                <span className="graphite-caption">
                  Selected model: {attribution === "last" ? "Last touch" : "First touch"}.
                </span>
              </Specimen>
              <Specimen title="Switch">
                <Label className="graphite-choice">
                  <Switch defaultChecked />
                  Live traffic updates
                </Label>
                <Label className="graphite-choice">
                  <Switch />
                  Weekly report digest
                </Label>
                <Label className="graphite-choice">
                  <Switch disabled />
                  Revenue alerts / unavailable
                </Label>
              </Specimen>
              <Specimen title="Select">
                <div className="graphite-field">
                  <Label htmlFor="channel">Traffic channel</Label>
                  <Select id="channel" defaultValue="all">
                    <option value="all">All channels</option>
                    <option value="organic">Organic search</option>
                    <option value="direct">Direct</option>
                    <option value="referral">Referral</option>
                    <option value="paid">Paid search</option>
                  </Select>
                </div>
                <div className="graphite-field">
                  <Label htmlFor="archived-site">Archived website</Label>
                  <Select id="archived-site" disabled>
                    <option>Kousa staging</option>
                  </Select>
                </div>
                <div className="graphite-field">
                  <Label htmlFor="required-site">Website / invalid specimen</Label>
                  <Select
                    id="required-site"
                    aria-invalid="true"
                    aria-describedby="site-error"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select a website
                    </option>
                    <option value="kousa">kousa.io</option>
                  </Select>
                  <small id="site-error" data-error>
                    Select a website to continue.
                  </small>
                </div>
              </Specimen>
            </div>
          </Section>

          <Section
            id="overlays"
            title="06 / Overlays"
            description="Open each example to inspect dismissal, keyboard focus, and responsive positioning. All changes stay in this local demo."
          >
            <div className="graphite-grid">
              <Specimen title="Dialog">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger render={<Button variant="outline" />}>
                    <PlusIcon aria-hidden="true" />
                    Create funnel
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create a funnel</DialogTitle>
                      <DialogDescription>
                        Give your conversion journey a name. This demo saves the name locally on the page.
                      </DialogDescription>
                    </DialogHeader>
                    <form
                      className="graphite-stack"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!funnelName.trim()) return;
                        setSavedFunnel(funnelName.trim());
                        setDialogOpen(false);
                        notify("Funnel created in this demo.");
                      }}
                    >
                      <div className="graphite-field">
                        <Label htmlFor="funnel-name">Funnel name</Label>
                        <Input
                          id="funnel-name"
                          value={funnelName}
                          onChange={(event) => setFunnelName(event.target.value)}
                          required
                          pattern=".*\S.*"
                          maxLength={80}
                        />
                      </div>
                      <DialogFooter>
                        <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
                        <Button type="submit">Create funnel</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <span className="graphite-caption">
                  {savedFunnel ? `Created: ${savedFunnel}` : "Build a journey from landing page to purchase."}
                </span>
              </Specimen>
              <Specimen title="Sheet">
                <Sheet
                  open={sheetOpen}
                  onOpenChange={(open) => {
                    if (open) setDraftExcludeInternal(excludeInternal);
                    setSheetOpen(open);
                  }}
                >
                  <SheetTrigger render={<Button variant="outline" />}>
                    <FunnelIcon aria-hidden="true" />
                    Journey filters
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Journey filters</SheetTitle>
                      <SheetDescription>
                        Choose which visitor journeys to include in this demo.
                      </SheetDescription>
                    </SheetHeader>
                    <Label className="graphite-choice">
                      <Checkbox checked={draftExcludeInternal} onCheckedChange={setDraftExcludeInternal} />
                      Exclude internal traffic
                    </Label>
                    <SheetFooter>
                      <SheetClose render={<Button variant="ghost" />}>Cancel</SheetClose>
                      <Button
                        onClick={() => {
                          setExcludeInternal(draftExcludeInternal);
                          setSheetOpen(false);
                          notify("Journey filters applied in this demo.");
                        }}
                      >
                        Apply filters
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
                <span className="graphite-caption">
                  Internal traffic is {excludeInternal ? "excluded" : "included"}.
                </span>
              </Specimen>
              <Specimen title="Popover">
                <Popover
                  open={popoverOpen}
                  onOpenChange={(open) => {
                    if (open) setDraftPeriod(period);
                    setPopoverOpen(open);
                  }}
                >
                  <PopoverTrigger render={<Button variant="outline" />}>Last {period} days</PopoverTrigger>
                  <PopoverContent aria-label="Choose reporting period">
                    <div className="graphite-stack">
                      <div className="graphite-field">
                        <Label htmlFor="date-range">Reporting period</Label>
                        <Select
                          id="date-range"
                          value={draftPeriod}
                          onChange={(event) => setDraftPeriod(event.target.value)}
                        >
                          <option value="7">Last 7 days</option>
                          <option value="30">Last 30 days</option>
                          <option value="90">Last 90 days</option>
                        </Select>
                      </div>
                      <PopoverClose render={<Button onClick={() => setPeriod(draftPeriod)} />}>
                        Apply period
                      </PopoverClose>
                    </div>
                  </PopoverContent>
                </Popover>
              </Specimen>
              <Specimen title="Tooltip">
                <Tooltip>
                  <TooltipTrigger render={<Button variant="outline" />}>About unique visitors</TooltipTrigger>
                  <TooltipContent>Distinct visitors during the selected reporting period.</TooltipContent>
                </Tooltip>
                <span className="graphite-caption">Hover or focus the button to reveal the explanation.</span>
              </Specimen>
            </div>
          </Section>

          <Section
            id="navigation"
            title="07 / Navigation"
            description="Tabs support arrow-key navigation. Menus support keyboard selection, Escape, and disabled items."
          >
            <div className="graphite-grid">
              <Specimen title="Tabs">
                <Tabs defaultValue="traffic">
                  <TabsList aria-label="Analytics report">
                    <TabsTrigger value="traffic">Traffic</TabsTrigger>
                    <TabsTrigger value="journeys">Journeys</TabsTrigger>
                    <TabsTrigger value="revenue">Revenue</TabsTrigger>
                    <TabsTrigger value="cohorts" disabled>
                      Cohorts
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="traffic">
                    <p className="graphite-metric">24,892</p>
                    <p className="graphite-caption">Unique visitors · Last 30 days</p>
                  </TabsContent>
                  <TabsContent value="journeys">
                    <p className="graphite-metric">3,208</p>
                    <p className="graphite-caption">Completed visitor journeys · Last 30 days</p>
                  </TabsContent>
                  <TabsContent value="revenue">
                    <p className="graphite-metric">$48,290</p>
                    <p className="graphite-caption">Attributed revenue · Last 30 days</p>
                  </TabsContent>
                </Tabs>
              </Specimen>
              <Specimen title="Dropdown Menu">
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="outline" />}>
                    Report actions
                    <DotsThreeIcon aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Kousa / Traffic overview</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => notify("Report duplicated in this demo.")}>
                        <PlusIcon aria-hidden="true" />
                        Duplicate report
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => notify("CSV export prepared in this demo.")}>
                        <DownloadSimpleIcon aria-hidden="true" />
                        Export CSV
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>Archive report / unavailable</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Specimen>
            </div>
          </Section>

          <Section
            id="feedback"
            title="08 / Feedback"
            description="Status messages stay quiet and readable. Loading states respect reduced motion."
          >
            <div className="graphite-grid">
              <Specimen title="Alert / variants">
                <Alert>
                  <AlertTitle>Tracking is ready</AlertTitle>
                  <AlertDescription>Add the Kousa script to start measuring visits.</AlertDescription>
                </Alert>
                <Alert variant="success">
                  <AlertTitle>Website connected</AlertTitle>
                  <AlertDescription>Page views are arriving from kousa.io.</AlertDescription>
                </Alert>
                <Alert variant="warning">
                  <AlertTitle>Revenue data is delayed</AlertTitle>
                  <AlertDescription>The latest purchase events are still processing.</AlertDescription>
                </Alert>
                <Alert variant="destructive">
                  <AlertTitle>Tracking connection lost</AlertTitle>
                  <AlertDescription>Check that the script is installed on your website.</AlertDescription>
                </Alert>
              </Specimen>
              <div className="graphite-stack">
                <Specimen title="Skeleton">
                  <Card aria-busy="true" aria-label="Loading traffic report">
                    <div className="graphite-stack">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-12 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                    </div>
                  </Card>
                </Specimen>
                <Specimen title="Spinner">
                  <div className="graphite-row">
                    <Spinner />
                    <span>Processing visitor journeys</span>
                  </div>
                </Specimen>
                <Specimen title="Toast">
                  <Button variant="outline" onClick={() => notify("Your traffic report is ready to share.")}>
                    <CheckIcon aria-hidden="true" />
                    Show notification
                  </Button>
                  <span className="graphite-caption">
                    Dismiss with the close button, Escape, or a swipe. Hover or focus pauses the five-second
                    timer.
                  </span>
                </Specimen>
              </div>
            </div>
          </Section>
          <footer className="graphite-caption">
            Vega for Kousa · Graphite palette · Sample analytics data
          </footer>
        </div>
      </TooltipProvider>
    </>
  );
}
