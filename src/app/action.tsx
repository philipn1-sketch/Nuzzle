import { Redirect } from 'expo-router';

/**
 * nuzzle://action links from Siri and the Shortcuts app are acted on by LinkActions in the root layout,
 * which sees every link even when the same one comes twice. This screen only sends her back to Home.
 */
export default function Action() {
  return <Redirect href="/" />;
}
