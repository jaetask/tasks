// The images Domain: pictures attached to a ticket.
import { defineCard, defineDomain } from "@jaetask/open-agent-kit";
import { z } from "zod";
import { type Base, readAction, writeAction } from "../actions.js";
import { OWNER } from "../catalog/catalog.js";
import { Refusal } from "../refusal.js";
import type { Tickets } from "../tickets/tickets.js";
import { Image, type Images, MAX_BYTES, Type } from "./images.js";

export type ImagesDeps = Base & {
  tickets: Pick<Tickets, "get">;
  images: Images;
  now(): number;
};

export const imageList = defineCard({
  name: "images",
  version: 1,
  about: "A list of a ticket's images.",
  view: {
    kind: "list",
    title: "Images",
    fields: [
      { label: "Id", path: "id" },
      { label: "Name", path: "name" },
      { label: "Bytes", path: "size" },
    ],
  },
});

export const imageChanged = defineCard({
  name: "image-changed",
  version: 1,
  about: "What a Call changed in a ticket's images.",
  view: { kind: "change", title: "Images changed" },
});

// Base64 is four characters for every three bytes.
const data = z
  .string()
  .min(1)
  .max(Math.ceil(MAX_BYTES / 3) * 4)
  .regex(/^[A-Za-z0-9+/]*={0,2}$/, "data is base64")
  .describe(`The image as base64, at most ${MAX_BYTES} bytes once decoded.`);

const list = readAction({
  name: "image-list",
  description: "List a ticket's images.",
  input: z.object({ ticket: z.string() }),
  output: z.array(Image),
  card: imageList,
  run: ({ ticket }, { tickets, images }: ImagesDeps) => {
    tickets.get(ticket);
    return images.list(ticket);
  },
});

const read = readAction({
  name: "image-read",
  description: "Read one image, with its data as base64.",
  input: z.object({ image: z.string() }),
  output: Image.extend({ data: z.string() }),
  run: ({ image }, { images }: ImagesDeps) => ({
    ...images.get(image),
    data: Buffer.from(images.bytes(image)).toString("base64"),
  }),
});

const add = writeAction<
  z.ZodObject<{ ticket: z.ZodString; name: z.ZodString; type: typeof Type; data: typeof data }>,
  typeof Image,
  ImagesDeps
>("images", {
  name: "image-add",
  description: "Attach an image to a ticket, such as a screenshot of the result.",
  input: z.object({
    ticket: z.string(),
    name: z.string().trim().min(1).max(120),
    type: Type,
    data,
  }),
  output: Image,
  card: imageChanged,
  run: ({ ticket, name, type, data }, { tickets, images, principal, now, log }) => {
    tickets.get(ticket);
    const image = images.add(principal.id, new Date(now()).toISOString(), {
      ticket,
      name,
      type,
      bytes: Buffer.from(data, "base64"),
    });
    log(
      `attached the image ${name} to ${ticket}`,
      { kind: "created", subject: "image", id: image.id },
      ticket,
    );
    return image;
  },
});

const remove = writeAction<z.ZodObject<{ image: z.ZodString }>, typeof Image, ImagesDeps>(
  "images",
  {
    name: "image-remove",
    description: "Remove an image from a ticket. Whoever attached it or the owner can.",
    input: z.object({ image: z.string() }),
    output: Image,
    card: imageChanged,
    run: ({ image: id }, { images, principal, log }) => {
      const { by } = images.get(id);
      if (by !== principal.id && principal.id !== OWNER) {
        throw new Refusal(
          "not-yours",
          "Only whoever attached it or the owner can remove an image.",
        );
      }
      const image = images.remove(id);
      log(
        `removed the image ${image.name} from ${image.ticket}`,
        { kind: "deleted", subject: "image", id },
        image.ticket,
      );
      return image;
    },
  },
);

export const imagesDomain = defineDomain<ImagesDeps>({
  name: "images",
  version: "1.0.0",
  about: "Images attached to tickets, such as screenshots.",
  actions: [list, read, add, remove],
  cards: [imageList, imageChanged],
});
