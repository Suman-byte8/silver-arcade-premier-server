// middleware/trimExtraSegments.js
function trimExtraSegments(expectedSegments = 0) {
  return function (req, res, next) {
    const originalUrl = req.url;
    const [path, query] = req.url.split("?");

    let parts = path.split("/");

    // Decode each segment to handle browser encoding differences
    parts = parts.map(segment => {
      try {
        return decodeURIComponent(segment);
      } catch (e) {
        // If decoding fails, return the original segment
        console.log(`Failed to decode segment: ${segment}, error: ${e.message}`);
        return segment;
      }
    });

    // If extra parts beyond expectedSegments -> trim them
    if (parts.length > expectedSegments && expectedSegments > 0) {
      req.url = parts.slice(0, expectedSegments).join("/") + (query ? "?" + query : "");
    }
    // If no trimming needed, leave req.url as is to let Express handle decoding

    // Log the original and transformed URLs for debugging
    console.log(`Original URL: ${originalUrl}`);
    console.log(`Transformed URL: ${req.url}`);
    console.log(`Parts: ${JSON.stringify(parts)}`);

    next();
  };
}

module.exports = trimExtraSegments;
  