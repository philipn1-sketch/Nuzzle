import { printToFileAsync } from 'expo-print';
import { Share } from 'react-native';

/** Turns the summary into a PDF and opens the share sheet, so she can AirDrop, message or print it. */
export async function shareSummaryPdf(html: string): Promise<void> {
  const { uri } = await printToFileAsync({ html });
  await Share.share({ url: uri });
}
