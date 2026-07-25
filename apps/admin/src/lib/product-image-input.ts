const isSupportedImageReference = (value: string) => {
  if (/\s/.test(value)) {
    return false;
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const parseProductImageInput = (
  value: string,
  colors: Array<string>,
) => {
  const images: Record<string, string> = {};
  const trimmedValue = value.trim();

  if (trimmedValue.startsWith("{")) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(trimmedValue);
    } catch {
      throw new Error("Images JSON is not valid.");
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Images JSON must be an object of color and URL pairs.");
    }

    for (const [color, imageUrl] of Object.entries(parsed)) {
      if (typeof imageUrl !== "string") {
        throw new Error(`Image for ${color} must be a URL or path.`);
      }

      images[color.trim()] = imageUrl.trim();
    }
  } else {
    const standaloneReferences: Array<string> = [];

    for (const rawLine of value.split("\n")) {
      const line = rawLine.trim();

      if (!line) {
        continue;
      }

      if (isSupportedImageReference(line)) {
        standaloneReferences.push(line);
        continue;
      }

      const equalsIndex = line.indexOf("=");
      const colonMatch = line.match(/^([^:]+):\s+(https?:\/\/|\/)/);
      const separatorIndex =
        equalsIndex >= 0 ? equalsIndex : colonMatch?.[1]?.length;

      if (separatorIndex === undefined || separatorIndex < 0) {
        throw new Error(`Invalid image mapping: ${line}`);
      }

      const normalizedColor = line.slice(0, separatorIndex).trim();
      const imageUrl = line.slice(separatorIndex + 1).trim();

      if (!normalizedColor || !imageUrl) {
        throw new Error(`Invalid image mapping: ${line}`);
      }

      images[normalizedColor] = imageUrl;
    }

    if (standaloneReferences.length === 1) {
      for (const color of colors) {
        images[color] = standaloneReferences[0] ?? "";
      }
    } else if (standaloneReferences.length > 1) {
      if (standaloneReferences.length !== colors.length) {
        throw new Error(
          "Provide one image URL for all colors, or one URL per color in the same order.",
        );
      }

      colors.forEach((color, index) => {
        images[color] = standaloneReferences[index] ?? "";
      });
    }
  }

  for (const [color, imageUrl] of Object.entries(images)) {
    if (!isSupportedImageReference(imageUrl)) {
      throw new Error(
        `Image for ${color} must be an HTTP(S) URL or a root-relative path.`,
      );
    }
  }

  return images;
};
