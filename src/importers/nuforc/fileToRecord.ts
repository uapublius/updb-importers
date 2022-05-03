import path from "path";
import { decode } from "html-entities";
import { stripUnicodeSpecial } from "../../utils";
import { NuforcRecord } from "../../sources";

//
// File -> NuforcRecord
//

export function fileToRecord(file: string, tds: NodeListOf<HTMLTableCellElement>) {
  let id = path.parse(file).name.replace(".html", "");
  let eventDate = "";
  let reportedDate = "";
  let postedDate = "";
  let location = "";
  let shape = "";
  let duration = "";
  let characteristics = "";
  let attachments: string[] = [];
  let text = "";

  for (let idx = 0; idx < tds.length; idx++) {
    let td = tds[idx];

    if (idx === 0) {
      // First row - fields
      let text = td.querySelector("font")?.innerHTML || "";
      let fields = text.split("<br>");

      for (let jdx = 0; jdx < fields.length; jdx++) {
        let field = fields[jdx];
        let fieldParts = field?.match(/^\w+\s?: (.*)$/);

        if (fieldParts && fieldParts.length > 1) {
          let contents = fieldParts[1];

          switch (jdx) {
            case 0:
              eventDate = contents;
              break;
            case 1:
              reportedDate = contents;
              break;
            case 2:
              postedDate = contents;
              break;
            case 3:
              location = contents;
              break;
            case 4:
              shape = contents;
              break;
            case 5:
              duration = contents;
              break;
            case 6:
              characteristics = contents;
              break;
            default:
              break;
          }
        }
      }
    } else if (idx === 1) {
      // Second row - body
      let font = td.querySelector("font")?.innerHTML || "";
      font = font.replace(/<br>/g, "");
      font = font.replace(/�/g, "");
      text = font;
    } else {
      // Subsequent rows - attachments
      let imgs = td.querySelectorAll("img");

      for (let img of imgs) {
        let src = img.src.replace(/(\.\.\/)+nuforc\.org/, "http://www.nuforc.org");
        attachments.push(src);
      }
    }
  }

  let entry: NuforcRecord = {
    id,
    event_date: eventDate,
    reported_date: reportedDate,
    posted_date: postedDate,
    location,
    shape: decode(stripUnicodeSpecial(shape)),
    duration: decode(stripUnicodeSpecial(duration)),
    characteristics: decode(stripUnicodeSpecial(characteristics)),
    text: decode(stripUnicodeSpecial(text)),
    attachments
  };

  return entry;
}
