// 테마별 그림 프롬프트. 원문은 사용자가 정한 것이고, 투명 배경 지시만 흰 배경으로 바꿨다.
// (이미지 모델은 진짜 투명 PNG를 못 만든다. 흰 배경으로 받아 앱이 기기에서 병만 떼어 낸다.)
// 배포 없이 바꾸려면 Supabase 시크릿 PROMPT_WATERCOLOR 등으로 덮어쓴다.

export const DEFAULT_STYLES: Record<string, string> = {
  // 수채화
  watercolor: `Transform the uploaded photograph of a bottle into a delicate, hand-painted watercolor illustration on a plain pure white background.

Step 1 — Identify and isolate the bottle
- Identify the main bottle in the uploaded photograph.
- Precisely remove the entire original background, including tables, walls, surrounding objects, reflections outside the bottle, and cast shadows.
- Preserve the bottle's complete silhouette, from the cap to the base.
- Maintain its original shape, proportions, label placement, glass structure, and liquid level.
- Do not crop, stretch, rotate, or distort the bottle.

Step 2 — Transform into watercolor
- Repaint the isolated bottle as a traditional hand-painted watercolor illustration.
- Use delicate, translucent watercolor washes with naturally overlapping layers of pigment.
- Incorporate subtle watercolor granulation, gentle pigment bleeding, and organic brushstrokes.
- Use fine, slightly imperfect pencil-like outlines to define the bottle.
- Apply a warm, muted palette of soft ivory, beige, pale ochre, dusty lavender, warm gray, and subtle golden highlights.
- Depict the transparent glass using soft, layered washes of pale blue, cream, and muted gray.
- Preserve the bottle's original colors and the appearance of any liquid inside.
- Maintain soft, natural transitions between highlights and shadows.
- Give the illustration a refined, nostalgic, handmade quality, as if painted in a vintage watercolor sketchbook.
- Avoid photorealism, sharp digital rendering, thick oil-paint textures, and cartoon-like simplification.

Step 3 — Preserve product identity
- Keep the bottle recognizable as the exact product in the original photograph.
- Preserve the original branding, label composition, prominent typography, logos, and illustrated details as accurately as possible.
- Render the labels in the same watercolor style without replacing, inventing, or redesigning their content.

Step 4 — Plain white background
- Output only the watercolor-painted bottle.
- Remove all background elements completely.
- Fill everything outside the bottle with flat, plain pure white (#FFFFFF). No checkerboard pattern, no paper texture.
- Do not include watercolor paper, colored backgrounds, ground surfaces, or cast shadows.
- Preserve naturally soft, painterly edges around the bottle without adding white halos.
- Keep the glass visibly transparent as watercolor glass while preserving the bottle's physical silhouette.

Final output
- One isolated watercolor bottle.
- High-resolution image on a plain pure white background.
- Entire bottle visible, centered and upright.
- Tight crop with minimal white padding.
- No additional objects or decorations.

The final image should look like a beautifully hand-painted watercolor bottle illustration, suitable as a standalone collectible asset in a vintage-inspired mobile app.`,
  // 모네
  monet: `Transform the uploaded photograph of a bottle into a beautiful impressionist oil painting inspired by Claude Monet, on a plain pure white background.

Step 1 — Identify and isolate the bottle
- Detect the main bottle in the uploaded photograph.
- Completely remove the original photographic background, including any tables, walls, nearby objects, and environmental shadows.
- Preserve the exact bottle shape, proportions, silhouette, cap, glass structure, label placement, and liquid level.
- Keep the entire bottle visible in its original front-facing orientation.

Step 2 — Apply Monet-inspired impressionist painting
- Repaint the isolated bottle in the style of French Impressionism, inspired by Claude Monet's treatment of natural light and color.
- Use delicate, visible oil-paint brushstrokes and broken-color techniques.
- Build forms through small, overlapping strokes of complementary and neighboring colors rather than smooth digital gradients.
- Emphasize luminous, atmospheric lighting and subtle color interactions.
- Introduce gentle combinations of pastel blue, lavender, muted violet, pale pink, warm cream, soft ochre, and golden yellow.
- Use cool blue and lavender tones for glass reflections, balanced with warm golden highlights.
- Render transparent glass through layered, painterly reflections and delicate variations of light.
- Preserve the original product's main colors, allowing subtle impressionist color variation.
- Keep the bottle's shape sufficiently defined while allowing soft, expressive edges.
- Create the appearance of authentic oil paint on canvas, with visible but delicate brush texture.
- Avoid excessive abstraction, harsh outlines, swirling Van Gogh-like strokes, or heavy impasto.
- The painting should feel luminous, elegant, atmospheric, and naturally handmade.

Step 3 — Preserve product details
- Retain the original brand identity and recognizable label design.
- Preserve prominent lettering, logos, illustrations, and label proportions as accurately as possible.
- Translate the original labels into an impressionist painted appearance without inventing or changing the design.

Step 4 — Plain white background
- The final image must contain only the painted bottle.
- Do not include any landscape, garden, sky, water, table, floor, painting canvas, or decorative background.
- Do not add environmental shadows or surrounding brushstrokes.
- Fill everything outside the bottle with flat, plain pure white (#FFFFFF). No checkerboard pattern, no paper texture.
- Retain natural, painterly edges without white outlines or colored halos.
- Keep glass reflections and transparent glass details visually intact.

Final output
- One complete isolated bottle.
- High-resolution image on a plain pure white background.
- Straight-on, upright orientation.
- Tight crop with minimal white padding.
- No background, extra objects, or text outside the original label.

The final result should look like a bottle painted by a skilled French Impressionist artist, with Monet-inspired luminous colors and gentle brushwork, presented as a standalone asset for a mobile application.`,
  // 고흐
  vangogh: `Transform the uploaded photograph of a bottle into an expressive post-impressionist oil painting inspired by Vincent van Gogh, on a plain pure white background.

Step 1 — Identify and isolate the bottle
- Identify the bottle in the uploaded photograph.
- Accurately remove its original background, including all furniture, walls, surfaces, nearby objects, and cast shadows.
- Preserve the entire bottle silhouette from cap to base.
- Maintain the original bottle proportions, glass structure, label placement, and liquid level.
- Keep the bottle upright and recognizable as the original product.

Step 2 — Apply Van Gogh-inspired painting
- Repaint the isolated bottle in a bold post-impressionist oil painting style inspired by Vincent van Gogh.
- Use thick, expressive, directional brushstrokes with visible impasto-like paint texture.
- Incorporate rhythmic, energetic strokes that follow the bottle's physical contours.
- Create strong yet harmonious contrasts between cobalt blue, ultramarine, turquoise, golden yellow, warm amber, burnt orange, and deep brown.
- Use vivid blue and golden highlights to describe reflections on the glass.
- Render the bottle's transparent glass with expressive strokes of blue, cream, pale yellow, and bright white.
- Emphasize rich pigment, layered paint, visible brush ridges, and dynamic color movement.
- Apply expressive outlines around the bottle and label details while retaining their original shapes.
- Preserve the natural colors of the original product while enhancing them through Van Gogh-inspired color contrast.
- Maintain a vivid, energetic, handmade oil-painting appearance.
- Avoid photorealism, smooth digital shading, watercolor washes, or flat vector illustration.
- Do not introduce decorative swirls or additional scenery outside the bottle.

Step 3 — Preserve product identity
- Keep the original label layout, brand identity, prominent text, logos, and illustrated elements recognizable.
- Preserve major lettering and label details as accurately as possible.
- Translate them into expressive oil-paint brushwork without redesigning the product.

Step 4 — Plain white background
- Remove every background element completely.
- Do not include swirling skies, stars, landscapes, painting canvases, tables, floors, or environmental shadows.
- Keep all expressive brushstrokes contained within the bottle silhouette.
- Fill everything outside the bottle with flat, plain pure white (#FFFFFF). No checkerboard pattern, no paper texture.
- Preserve naturally textured painted edges without white borders or colored halos.
- Maintain the painted appearance of transparent glass without accidentally removing parts of the bottle.

Final output
- One isolated post-impressionist bottle illustration.
- High-resolution image on a plain pure white background.
- Entire bottle visible and upright.
- Minimal white padding.
- No additional objects or background decorations.

The result should resemble a richly textured Van Gogh-inspired oil painting of the original bottle, with bold directional strokes, vivid contrasting colors, and a plain pure white background, ready to use as a standalone mobile app asset.`,
  // 크레용(오일 파스텔·크레용)
  crayon: `Transform the uploaded photograph of a bottle into a charming, hand-drawn oil pastel and wax crayon illustration, on a plain pure white background.

Step 1 — Identify and isolate the bottle
- Detect the bottle as the only subject in the uploaded photograph.
- Completely remove the original background, including tables, walls, other objects, reflections outside the bottle, and shadows.
- Preserve the original bottle's silhouette, proportions, cap, glass structure, label arrangement, and liquid level.
- Keep the entire bottle visible in a straight-on, upright orientation.

Step 2 — Apply a handmade crayon and oil pastel style
- Redraw the isolated bottle as a playful, hand-drawn illustration using traditional oil pastels and wax crayons.
- Use thick, rough, slightly uneven outlines in warm reddish-brown, dark brown, and muted charcoal.
- Create grainy, waxy color textures with visible individual crayon marks.
- Apply imperfect, overlapping strokes, irregular color fills, and natural hand-drawn inconsistencies.
- Simplify small visual details slightly while keeping the bottle clearly recognizable.
- Use a warm, cheerful palette of soft cream, pale peach, dusty pink, light blue, muted gray, warm ochre, golden yellow, and dark brown.
- Render transparent glass with loose cream, light blue, pale gray, and warm yellow pastel marks.
- Preserve the original liquid color, using textured golden and orange crayon strokes where appropriate.
- Keep the black-and-gold or otherwise colored original label recognizable, rendered using the same crayon technique.
- Create charming, intentionally imperfect contours that feel drawn by hand rather than digitally generated.
- Allow subtle irregularities and unfilled patches inside the illustration to enhance the authentic pastel texture.
- Avoid smooth gradients, polished digital vector art, realistic photographic details, watercolor bleeding, and thick oil-paint impasto.
- The result should feel warm, nostalgic, playful, and slightly naive, like a handmade illustration in an independent art zine.

Step 3 — Preserve recognizable product details
- Maintain the original branding, label composition, prominent typography, and key illustrations.
- Keep major lettering and logos accurate and readable whenever possible.
- Do not invent new branding or redesign the bottle.
- Render all details using textured pastel marks and imperfect hand-drawn lines.

Step 4 — Plain white background
- Keep only the illustrated bottle.
- Do not add a pink background, colored paper, canvas texture outside the bottle, decorative scribbles, ground, table, or shadows.
- Fill everything outside the bottle with flat, plain pure white (#FFFFFF). No checkerboard pattern, no paper texture.
- Preserve slightly rough, crayon-textured edges along the bottle silhouette.
- Do not add white borders, outlines, or colored halos.
- Preserve the appearance of glass using colored pastel strokes without erasing the bottle's glass structure.

Final output
- One isolated oil pastel bottle illustration.
- High-resolution image on a plain pure white background.
- Entire bottle centered and upright.
- Tight crop with minimal white padding.
- No additional objects, background elements, or external decorations.

The final result should look like a lovingly hand-drawn crayon and oil pastel illustration of the original bottle, with playful imperfections, warm colors, tactile waxy textures, and a plain pure white background, ready for use as a collectible asset in a mobile app.`,
};
