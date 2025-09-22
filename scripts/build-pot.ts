import { GettextExtractor, JsExtractors } from 'gettext-extractor';
import path from 'path';

const SRC_DIR = path.join(__dirname, '..', 'src');
const POT_FILE = path.join(SRC_DIR, 'i18n.pot');

/**
 * Use a custom Node script as gettext doesn't support TypeScript (?)
 */

const initialExtractor = new GettextExtractor();

initialExtractor
  .createJsParser([JsExtractors.callExpression('gettext', { arguments: { text: 0, context: 1 } })])
  .parseFilesGlob(path.join(SRC_DIR, '**', '*.ts'));

/**
 * Create a new extractor and manually populate it with derived message objects
 * as gettext-extractor library writes a full local path which I don't want to
 * commit to source control.
 */
const finalExtractor = new GettextExtractor();

initialExtractor.getMessages().forEach((message) => {
  finalExtractor.addMessage({
    comments: [],
    context: undefined,
    text: message.text,
    textPlural: message.textPlural || undefined,

    references: (message.references || []).map((original) => {
      const [fullPath, lineNumber] = original.split(':');
      const [, srcPath] = fullPath.split('src');

      return `src${srcPath}:${lineNumber}`;
    }),
  });
});

finalExtractor.savePotFile(POT_FILE);
finalExtractor.printStats();
