// https://cydstumpel.nl/

import * as THREE from "three";
// Import useEffect and useState
import {
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from "react";
// Import useThree
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Image,
  Environment,
  ScrollControls,
  useScroll,
  useTexture,
} from "@react-three/drei";
import { easing } from "maath";
import "../utils/caroselUtil";
import { gsap } from "gsap";

// Define the number of cards to display
const NUM_CARDS_TO_DISPLAY = 6;

const fetchImageData = async (webhookUrl) => {
  try {
    const response = await fetch(webhookUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch image data: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching image data:", error);
    // Return empty array as fallback
    return [];
  }
};

const url =
  "https://webhook.creative-directors.com/webhook/7bd04d17-2d35-49e1-a2aa-10b5c8ee3429";
const endpointResponse = await fetchImageData(url);

// Slice the data using the constant
const carouselData = endpointResponse.slice(0, NUM_CARDS_TO_DISPLAY);

// output example :
// [
//   {
//       "slug": "tankstelle-scheyern",
//       "name": "Tankstelle Scheyern",
//       "images": [
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c974bb84f5ffdada141cec_2c_TankstelleScheyernMorning.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c974bbbca88401e250c10c_26_Visitenkarten_Tankstelle_Scheyern.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c974bbe6c339f89e21697c_27_Tankstelltescheyer_pay.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c974bb05ea17f8f987df2e_28_Tankstellescheyern_Kaffeebecher.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67f4e15ead3768662e3eca44_TankstelleScheyern_mac.jpg"
//       ]
//   },
//   {
//       "slug": "shikido",
//       "name": "Shikido",
//       "images": [
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c972e43d5226676693aa2a_9f4_Flyer_Vorne_Shikido1.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c972e49d14c647bbedcc57_9f6_Webseite_Shikido.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c972e49071e5873e2c24b1_9f7_Handtuch_Shikido.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c972e45d4aa05dddc5a746_9f9_Kaffeetasse_shikido.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c972e4caba9d34551351ce_9fa_Shikido_Candle.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c972e4b0a4ded7fd55526a_9fc_Shikido_werbetafel.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c972e437e18fd7d474618c_a04_Shikido_seife.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c972e4447ad99ac486aee9_a05_Visitenkarte2_Shikido.jpg"
//       ]
//   },
//   {
//       "slug": "natural-spirit",
//       "name": "natural Spirit",
//       "images": [
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c97106954a83754bcceccf_9a0_6_music_headphones.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c971063a6b6c43249b83d5_9a3_responsive_natural.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c97106921a3e2913c3e9a0_9a4_cup.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c971067adf5f63a0e4545f_9a5_SWEATER_NS.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c9710631aaf8186bcfed1a_9a9_Flyer.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c97106954a83754bccecc6_9fe_Naturalspirit_Card.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c971063d5226676691c45d_9ff_Naturalspirit_Backpack.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c97106642e8ea8c5be3ddb_a00_Naturalspirit_Schild.jpg"
//       ]
//   },
//   {
//       "slug": "la-fee-dor",
//       "name": "La Fee Dor",
//       "images": [
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c9709e7af3f8dfe9cdda32_9a_lfd2.png",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c9709d921a3e2913c39669_52_Vorschau_Projekte.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c9709d3a6b6c43249b0cbd_65_mascara.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c9709d642e8ea8c5bdcc27_93_makeup1.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c9709eb3311991d1142ab8_94_eyeshadow1.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c9709dd472717eeda43c1e_95_eyeliner.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c9709ef1a9942cc89328fc_97_IMG_6375Tag1_Christine_Morfoula.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c9709e5cdae2c97b0db69a_98_lipgloss1.jpg"
//       ]
//   },
//   {
//       "slug": "jasminbooking",
//       "name": "Jasminbooking",
//       "images": [
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c9702cab61e8d080b808c2_9ab_Artboard%201.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c9702cd9d442bcf6e53df2_9ac_tasse-p-3200.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c9702c9229e8f74f5ec0d4_9ad_Envelopejasminbooking.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c9702cf713199ffba7d450_9af_LogoBooking.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c9702c5b78e5035da87bf2_9b0_Jasminbooking_flyer.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c9702c00b10562a8628c32_a02_Jasminbooking_Decke.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c9702c3427c1c6fba09eda_a03_Jasminbooking_Smartphone.jpg"
//       ]
//   },
//   {
//       "slug": "jadestein",
//       "name": "Jadestein",
//       "images": [
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c96ed3d078cee2dda083cc_6690f31bb1b84eba0a0c09b1_jadesteinpc.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c96ed37ef3dfc7e682d55c_6690f31bb1b84eba0a0c09e1_Detailshot_jadestein.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c96ed2b008c26e3704b69d_6690f31bb1b84eba0a0c09e3_Detailshot%20Coffee%20Machine_Jadestein.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c96ed349c684c24dbb1369_6690f31bb1b84eba0a0c09e4_BATHROOM_Jadestein.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c96ed34223a1173fb0801d_6690f31bb1b84eba0a0c09e6_Ku%CC%88che_Jadestein.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c96ed3c9a976265542e044_6690f31bb1b84eba0a0c09e7_Bedroom_Jadestein.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c96ed3bf1322e67b113535_6690f31bb1b84eba0a0c09e8_Sicht_Wohnzimmer_Jadestein.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c96ed3b0a4ded7fd5124e3_6690f31bb1b84eba0a0c09e9_Workingroom_Jadestein.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c96ed3f1a9942cc8917dde_solo_right.jpg"
//       ]
//   },
//   {
//       "slug": "bavarian-raptor",
//       "name": "Bavarian Raptor",
//       "images": [
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c9656715c11f72a95cc333_a6_4erbox_yellow_Background.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c965673018afbc9169db4b_a7_flying_bottle_added_fire.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c965675b3895fcde2230f8_a8_6112a0ac9faddd46bf6228d5_BR_Shirt_back_sqare.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c96567a38bd6b3782f70c1_aa_press_wall_banner.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c965670a408732c8c0be25_ae_611383eec832dc88f9384a74_Square_thankcard2.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c96567a4e39590276cc3d5_b3_BR_website_set.jpg"
//       ]
//   },
//   {
//       "slug": "raumglanz24",
//       "name": "Raumglanz24",
//       "images": []
//   },
//   {
//       "slug": "renderstudio24",
//       "name": "Renderstudio24",
//       "images": [
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c971b902a880ba567b0c32_001.jpeg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c971b93584a0ed8ccda619_002.jpeg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c971b9ab61e8d080b98700_003.jpeg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c971b9b0a4ded7fd544e82_0010.jpeg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c971b89e981208a82de0f7_0012.jpeg"
//       ]
//   },
//   {
//       "slug": "linea-d",
//       "name": "Linea-D",
//       "images": [
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c97607e017b015bf65ad0e_9b4_Messestand_LineaD_Stockholm_Vorderseite.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c976077eaca8d25191079e_9b5_LineaD_Messestand2_Stockholm.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c97607f81f0c4207eb144c_9b6_Linea_D_imac.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c976087acca2238bd1c6c8_9b8_LineaD_imola_table-whiteoak.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c97608b0a4ded7fd5808b1_9ba_LineaD_ImolaVitrine.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c97607abc281ad277cff8d_9d7_linea3.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c97607698be8ba4b982689_9be_LineaD_valhalacouch_whiteoak.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c976080c5c167976260b5a_865_4.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c97607698be8ba4b98267d_83a_5.jpg"
//       ]
//   },
//   {
//       "slug": "prowirtschaft",
//       "name": "ProWirtschaft",
//       "images": [
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c962d10ca1c62f1ad0241d_6690f31bb1b84eba0a0c0a0c_ProWirtschaft_Phones.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c962d1a4e39590276a92f6_6690f31bb1b84eba0a0c0a0d_Busineescards_Prowirtschaft.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c962d1056f5f46b0de2ec3_6690f31bb1b84eba0a0c0a08_Tischdecke_ProWirtschaft.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c962d1593836f79dadc2c5_6690f31bb1b84eba0a0c0a09_Banner_ProWirtschaft-p-2600.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c9714218545bd57f98c6ed_areal-cityjpg.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67a0ab4f35944ce72fd6e912_prowirtschaft.jpeg"
//       ]
//   },
//   {
//       "slug": "trufflepig-forensics",
//       "name": "Trufllepig Forensics",
//       "images": [
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c974fa0c5c16797624f755_cards.png",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c974fabca88401e250f05b_logo.png",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c974fa244a0825c2d15c55_pigs_planet_16_9.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c974fa698be8ba4b97213a_tf-forensics.jpeg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c974fa4ff3ebdeb5dfb55c_Truffelpig_businesscards_blue.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c974fa1785646ec42e6429_Trufflepig_schlu%CC%88sselanha%CC%88nger.jpg"
//       ]
//   },
//   {
//       "slug": "jasminbook",
//       "name": "Jasminbook",
//       "images": [
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c96f95d9d442bcf6e4c63c_9f5_lesemich_buch.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c96f95bb579585566f0aef_93d_Artboard_FFL.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c96f95954a83754bcbbe7a_906_Flyer_mockup.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c96f951bffeb5dca1612a2_923_visitenkarte1.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c96f95fd3e213e8686b350_983_Gb3.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c96f95749dd77cb022d8a8_984_Ho%CC%88rubch_mockup.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c96f95e01904a8ec0ee554_992_FFLMockup_mobil.jpg",
//           "https://cdn.prod.website-files.com/678907d8717d9b914d9d4bd6/67c96f957fab3e05484834ce_a01_MINDSETPower1.jpg"
//       ]
//   }
// ]

// Pass hover handlers and data down to Card
function Carousel({ radius = 4.4, data = [], onHoverStart, onHoverEnd }) {
  const count = data.length; // Use data length for count
  if (count === 0) return null; // Don't render if no data

  return data.map((item, i) => {
    // Use the first image from the item's images array, or a fallback
    const imageUrl = item.images?.[0] || "https://picsum.photos/600"; // Fallback if no images

    return (
      <Card
        key={item.slug || i} // Use slug as key if available
        url={imageUrl}
        position={[
          Math.sin((i / count) * Math.PI * 2) * radius,
          0,
          Math.cos((i / count) * Math.PI * 2) * radius,
        ]}
        rotation={[0, Math.PI + (i / count) * Math.PI * 2, 0]}
        onHoverStart={onHoverStart} // Pass down
        onHoverEnd={onHoverEnd} // Pass down
      />
    );
  });
}

// Accept and call hover handlers
function Card({ url, onHoverStart, onHoverEnd, ...props }) {
  const ref = useRef();
  const [hovered, hover] = useState(false);
  const pointerOver = (e) => {
    e.stopPropagation();
    hover(true);
    onHoverStart?.(); // Call handler if provided
  };
  const pointerOut = () => {
    // No stopPropagation needed on pointerOut usually
    hover(false);
    onHoverEnd?.(); // Call handler if provided
  };
  useFrame((state, delta) => {
    easing.damp3(ref.current.scale, hovered ? 1.5 : 1.3, 0.1, delta);
    easing.damp(
      ref.current.material,
      "radius",
      hovered ? 0.25 : 0.1,
      0.2,
      delta
    );
    easing.damp(ref.current.material, "zoom", hovered ? 1 : 1.5, 0.2, delta);
  });
  return (
    <Image
      ref={ref}
      url={url}
      transparent
      side={THREE.DoubleSide}
      onPointerOver={pointerOver}
      onPointerOut={pointerOut}
      {...props}
    >
      <bentPlaneGeometry args={[0.1, 1.618, 1, 20, 20]} />
    </Image>
  );
}

export const Rotator = forwardRef((props, ref) => {
  const carouselRef = useRef();
  const isDraggingRef = useRef(false);
  const prevXRef = useRef(0);
  const velocityRef = useRef(0); // Ref to store rotation velocity
  const pointerHistoryRef = useRef([]); // Ref to store recent pointer positions and times
  const hoveredCardCountRef = useRef(0); // Ref to count hovered cards
  const { gl } = useThree();
  // Remove isHovering state: const [isHovering, setIsHovering] = useState(false);

  // Constants for damping
  const rotationSensitivity = 0.001; // Keep the sensitivity for direct drag
  const dampingFactor = 0.92; // How quickly the velocity decays (0.9 = faster decay, 0.99 = slower decay)
  const minVelocity = 0.0001; // Threshold to stop the rotation completely
  const autoRotateSpeed = 0.0005; // Speed for default rotation

  // Expose methods to parent components via ref
  useImperativeHandle(ref, () => ({
    // Move the carousel to a specific Y position
    moveY: (y, options = {}) => {
      if (carouselRef.current) {
        return gsap.to(carouselRef.current.position, {
          y,
          duration: options.duration || 0.5,
          ease: options.ease || "power1.out",
          onStart: options.onStart,
          onComplete: options.onComplete,
        });
      }
    },

    // Get current Y position
    getY: () => carouselRef.current?.position.y,

    // Original methods (keep or modify as needed)
    rotate: (targetRotationY, options = {}) => {
      if (carouselRef.current) {
        // Example: Animate rotation to a specific angle
        return gsap.to(carouselRef.current.rotation, {
          y: targetRotationY,
          duration: options.duration || 0.5,
          ease: options.ease || "power1.out",
        });
      }
    },
    getObject: () => carouselRef.current,
  }));

  // Apply damping and auto-rotation in the render loop
  useFrame(() => {
    if (!isDraggingRef.current) {
      if (Math.abs(velocityRef.current) > minVelocity) {
        // Apply damping velocity
        carouselRef.current.rotation.y -= velocityRef.current;
        velocityRef.current *= dampingFactor;
      } else {
        velocityRef.current = 0;
        // Apply auto-rotation only if NO cards are hovered
        if (hoveredCardCountRef.current === 0) {
          carouselRef.current.rotation.y -= autoRotateSpeed;
        }
      }
    }
    // If dragging, rotation is handled by pointer move
  });

  // Remove useEffect for canvas hover state

  // Handlers for card hover events
  const handleCardHoverStart = () => {
    hoveredCardCountRef.current++;
    console.log(
      "Rotator: Card Hover Start, Count:",
      hoveredCardCountRef.current
    );
  };

  const handleCardHoverEnd = () => {
    hoveredCardCountRef.current = Math.max(0, hoveredCardCountRef.current - 1); // Prevent negative count
    console.log("Rotator: Card Hover End, Count:", hoveredCardCountRef.current);
  };

  // Renamed handler for clarity
  const handleWindowPointerMove = (e) => {
    if (!isDraggingRef.current) return;
    // No stopPropagation needed for window events generally
    const currentX = e.clientX;
    const deltaX = currentX - prevXRef.current;

    // Apply direct rotation during drag
    carouselRef.current.rotation.y -= deltaX * rotationSensitivity;

    // Store history for velocity calculation (timestamp and position)
    const now = performance.now();
    pointerHistoryRef.current.push({ x: currentX, time: now });
    // Keep only the last few entries (e.g., last 100ms worth)
    pointerHistoryRef.current = pointerHistoryRef.current.filter(
      (entry) => now - entry.time < 100
    );

    console.log(
      `Rotator: Window Pointer Move - DeltaX: ${deltaX}, PrevX: ${prevXRef.current}, CurrentX: ${currentX}`
    );
    prevXRef.current = currentX; // Update ref
  };

  // Renamed handler for clarity
  const handleWindowPointerUp = (e) => {
    if (isDraggingRef.current) {
      console.log("Rotator: Window Pointer Up");
      isDraggingRef.current = false; // Update ref
      gl.domElement.style.cursor = "grab"; // Restore cursor

      // Calculate velocity based on recent history
      if (pointerHistoryRef.current.length >= 2) {
        const first = pointerHistoryRef.current[0];
        const last =
          pointerHistoryRef.current[pointerHistoryRef.current.length - 1];
        const timeDiff = last.time - first.time;
        const posDiff = last.x - first.x;
        if (timeDiff > 10) {
          // Avoid division by zero or tiny time diffs
          const pixelsPerMs = posDiff / timeDiff;
          velocityRef.current = pixelsPerMs * rotationSensitivity * 16.67; // Scale velocity (adjust multiplier as needed)
          console.log(
            `Calculated Velocity: ${velocityRef.current} (from ${pixelsPerMs} px/ms)`
          );
        } else {
          velocityRef.current = 0; // Not enough movement or time
        }
      } else {
        velocityRef.current = 0; // Not enough history
      }

      // Clear history
      pointerHistoryRef.current = [];

      // Remove listeners from window
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
    }
  };

  const handlePointerDown = (e) => {
    e.stopPropagation(); // Prevent interfering with other interactions ON the element
    console.log("Rotator: Pointer Down on Group", e.clientX);
    isDraggingRef.current = true; // Update ref
    prevXRef.current = e.clientX; // Update ref
    velocityRef.current = 0; // Stop any existing damping
    pointerHistoryRef.current = [{ x: e.clientX, time: performance.now() }]; // Start history
    gl.domElement.style.cursor = "grabbing"; // Change cursor

    // Add listeners to window
    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
  };

  // Cleanup listeners if component unmounts while dragging
  useEffect(() => {
    return () => {
      if (isDraggingRef.current) {
        // Just in case
        window.removeEventListener("pointermove", handleWindowPointerMove);
        window.removeEventListener("pointerup", handleWindowPointerUp);
        gl.domElement.style.cursor = "grab"; // Ensure cursor is reset
      }
    };
  }, [gl.domElement]); // Dependency array includes gl.domElement

  return (
    <group
      ref={carouselRef}
      {...props}
      onPointerDown={handlePointerDown} // Only pointer down is needed here
    >
      {/* Pass handlers and sliced data down to Carousel */}
      <Carousel
        data={carouselData} // Pass the sliced data
        onHoverStart={handleCardHoverStart}
        onHoverEnd={handleCardHoverEnd}
      />
    </group>
  );
});
