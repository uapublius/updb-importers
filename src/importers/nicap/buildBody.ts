import * as windows1252 from '../../vendor/windows-1252';
import { cleanText, trimTextContent } from '../../utils';

export function buildBody(document: Document) {
  let isEmailType = document.querySelector('body > big > span.EUDORAHEADER') !== null;
  let isEmailType2 = document.querySelector('body > span.EUDORAHEADER') !== null;
  let isFrontpageType = document.querySelector('meta[content="Microsoft FrontPage 5.0"]') !== null;
  let isMozType = document.querySelector('meta[content^="Mozilla/4') !== null;
  let isWordType = document.querySelector('meta[content^="Microsoft Word "]') !== null;
  let isFullBody = isEmailType || isEmailType2 || isFrontpageType || isMozType || isWordType;

  let isCaseType = document.title === 'UFO Report';
  let caseType = document.querySelector('body > div > table > tbody > tr:nth-child(1) > td > center:nth-child(1) > table > tbody > tr > td:nth-child(2) > center > font > font')?.textContent?.trim();
  let caseType2 = document.querySelector('body > div > table > tbody > tr:nth-child(1) > td > table > tbody > tr > td:nth-child(2) > center > font > font')?.textContent?.trim();
  let caseType3 = document.querySelector('body > table > tbody > tr:nth-child(1) > td > center:nth-child(1) > table > tbody > tr > td:nth-child(2) > center > font > font')?.textContent?.trim();
  let caseType4 = document.querySelector('body > div > div > table > tbody > tr:nth-child(1) > td > center:nth-child(1) > table > tbody > tr > td:nth-child(2) > center > font > font')?.textContent?.trim();
  let caseCat = document.querySelector('body > table:nth-child(1) > tbody > tr > td:nth-child(1) > span:nth-child(5)')?.textContent?.trim();
  let isFirstTableBody = isCaseType;
  let isFotocat = document.title.endsWith('fotocat');
  let isOther2 = document.head.innerHTML.includes('<meta content="text/html; charset=ISO-8859-1" http-equiv="content-type"');

  let body = '';
  let type = '';

  if (isFullBody) {
    body = document.body.textContent?.trim() || '';
  }
  else if (isFirstTableBody) {
    body = document.querySelector('body > div > div > table')?.textContent?.trim() || '';
  }
  else if (caseType) {
    let node = document.querySelector('body > div > table > tbody > tr > td');

    body = node?.textContent?.trim() || '';
    type = caseType;
  }
  else if (isFotocat) {
    let nodes = document.querySelectorAll('body > div:not(:first-child)');

    body = [...nodes].map(trimTextContent)
      .join('\n')
      .replace(/.*We \(the[\s\S]*the fotocat link above.*/, '');
  }
  else if (isOther2) {
    let nodes = document.querySelectorAll('body > :not(big:first-child)');

    body = [...nodes]
      .map(trimTextContent)
      .join('\n');
  }
  else if (caseType3) {
    let nodes = document.querySelectorAll('body > table > tbody > tr > td > *');

    body = [...nodes]
      .filter(t => !t.innerHTML.includes('<img src="images/title.jpg"'))
      .map(trimTextContent)
      .filter(t => t && t !== 'NICAP Home Page')
      .join('\n');
    type = caseType3;
  }
  else if (caseType4) {
    let nodes = document.querySelectorAll('body > div > div > table > tbody > tr > td > *');

    body = [...nodes]
      .filter(t => !t.innerHTML.includes('<img src="http://www.nicap.org/images/title2.jpg"'))
      .map(trimTextContent)
      .filter(t => t && t !== 'NICAP Home Page')
      .join('\n');
    type = caseType4;
  }
  else if (caseCat) {
    let nodes = document.querySelectorAll('body > :not(:first-child):not(:last-child)');
    body = [...nodes].map(trimTextContent).join('\n');
  }
  else if (caseType2) {
    let nodes = document.querySelectorAll('body > div > table > tbody > tr > td > *');
    body = [...nodes].filter(t => !t.querySelector('img[src="images/title.jpg"]'))
      .map(trimTextContent)
      .join('\n');
    type = caseType2;
  }
  else {
    body = document.body.textContent?.trim() || '';
  }

  let is1252 = document.querySelector('meta[content="text/html; charset=windows-1252"]') !== null;
  if (is1252)
    body = windows1252.decode(body);

  body = body.split('\n').map(t => t.trim()).join('\n');
  body = cleanText(body);

  return { body, type };
}
