"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/registry/components/carousel";

type Toggle = "on" | "off";
const toggles: Toggle[] = ["off", "on"];

const scenes = [
  { image: "city", title: "City in mist" },
  { image: "railway", title: "Covered station" },
  { image: "deep-ocean", title: "Deep ocean" },
  { image: "library", title: "Round library" },
  { image: "airport-runway", title: "Morning runway" },
  { image: "radio-telescope", title: "Radio telescope" },
];

function Scene({ image, title, index }: { image: string; title: string; index: number }) {
  return (
    <div className="bg-muted relative aspect-[4/3] overflow-hidden rounded-xl select-none">
      <Image
        src={`/images/arc-reel/${image}.webp`}
        alt=""
        fill
        sizes="(max-width: 640px) 80vw, 360px"
        className="object-cover"
        draggable={false}
        data-carousel-parallax=""
      />
      <div className="from-foreground/60 absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t to-transparent p-3 pt-10">
        <span className="text-background text-sm font-medium">{title}</span>
        <span className="text-background/80 font-mono text-xs tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

export function CarouselPreview() {
  return (
    <Carousel aria-label="Scenes" className="w-full max-w-xs">
      <CarouselContent>
        {scenes.slice(0, 4).map((scene, index) => (
          <CarouselItem key={scene.image} className="basis-[72%]" aria-label={`${index + 1} of 4`}>
            <Scene {...scene} index={index} />
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

export function CarouselDemo() {
  const [loop, setLoop] = useState<Toggle>("off");
  const [parallax, setParallax] = useState<Toggle>("on");
  const [duration, setDuration] = useState(0.5);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <Carousel
          aria-label="Scenes"
          loop={loop === "on"}
          parallax={parallax === "on" ? 0.12 : 0}
          duration={duration}
          setApi={setApi}
          className="w-full max-w-md"
        >
          <CarouselContent>
            {scenes.map((scene, index) => (
              <CarouselItem
                key={scene.image}
                className="basis-[78%] sm:basis-[70%]"
                aria-label={`${index + 1} of ${scenes.length}`}
              >
                <Scene {...scene} index={index} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="mt-5 flex items-center justify-between gap-3 px-1">
            <CarouselPrevious />
            <CarouselDots />
            <CarouselNext />
          </div>
          <p aria-live="polite" className="text-muted-foreground mt-3 text-center text-xs">
            {scenes[current]?.title}, {current + 1} of {scenes.length}
          </p>
        </Carousel>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Loop" value={loop} options={toggles} onChange={setLoop} />
        <DemoSelect label="Parallax" value={parallax} options={toggles} onChange={setParallax} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
