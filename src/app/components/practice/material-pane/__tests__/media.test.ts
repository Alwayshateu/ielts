import { describe, expect, it } from 'vitest';

import { getQuestionAssetUrl, getUnitAssetUrl } from '../media';

describe('getUnitAssetUrl', () => {
  it('returns a trimmed url when asset_url is set', () => {
    expect(getUnitAssetUrl({ asset_url: '  https://cdn/x.png ' })).toBe('https://cdn/x.png');
  });

  it('treats null, empty, and whitespace-only as absent', () => {
    expect(getUnitAssetUrl({ asset_url: null })).toBeNull();
    expect(getUnitAssetUrl({ asset_url: '' })).toBeNull();
    expect(getUnitAssetUrl({ asset_url: '   ' })).toBeNull();
  });
});

describe('getQuestionAssetUrl', () => {
  it('reads a trimmed url from metadata.assetUrl', () => {
    expect(getQuestionAssetUrl({ metadata: { assetUrl: ' /maps/cam18-t1-p2.png ' } })).toBe('/maps/cam18-t1-p2.png');
  });

  it('returns null when metadata is missing, or assetUrl is absent, blank, or non-string', () => {
    expect(getQuestionAssetUrl({ metadata: undefined })).toBeNull();
    expect(getQuestionAssetUrl({ metadata: {} })).toBeNull();
    expect(getQuestionAssetUrl({ metadata: { assetUrl: '  ' } })).toBeNull();
    expect(getQuestionAssetUrl({ metadata: { assetUrl: 123 } })).toBeNull();
  });
});
