/**

 * RepWaveLogo — wordmark (R + REPWAVE) or icon-only

 * variant: "wordmark" | "icon" | "full" (full includes tagline — login only)

 */

import React from "react";

import {

  BRAND_LOGO_SRC,

  BRAND_LOGO_WORDMARK_SRC,

  BRAND_LOGO_ICON_SRC,

  BRAND_NAME,

  BRAND_TAGLINE,

} from "../../../constants/brandLogo.js";



export default function RepWaveLogo({

  size = 40,

  variant = "wordmark",

  showText = true,

  showTag = false,

  className = "",

}) {

  const alt = `${BRAND_NAME} — ${BRAND_TAGLINE}`;



  if (variant === "icon" || !showText) {

    return (

      <div

        className={`inline-flex items-center justify-center shrink-0 ${className}`.trim()}

        style={{ height: size, minWidth: size }}

        title={BRAND_NAME}

      >

        <img

          src={BRAND_LOGO_ICON_SRC}

          alt={BRAND_NAME}

          className="h-full w-auto max-w-none object-contain object-center select-none pointer-events-none"

          draggable={false}

        />

      </div>

    );

  }



  const src =

    variant === "full" || showTag ? BRAND_LOGO_SRC : BRAND_LOGO_WORDMARK_SRC;

  const height = variant === "full" || showTag ? size * 1.35 : size;



  return (

    <div

      className={`inline-flex items-center max-w-full overflow-visible ${className}`.trim()}

      style={{ height, maxHeight: height }}

      title={alt}

    >

      <img

        src={src}

        alt={alt}

        className="h-full w-auto max-w-full object-contain object-left select-none pointer-events-none block"

        draggable={false}

      />

    </div>

  );

}


