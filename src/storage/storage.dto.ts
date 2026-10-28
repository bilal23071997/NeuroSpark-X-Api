import { IsIn, IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateUploadDto {
  /**
   * `image` goes to the public area (png, jpeg, webp, gif, up to 5 MB).
   * `product-file` goes to the private area and is never publicly readable.
   */
  @IsIn(['image', 'product-file'])
  kind: 'image' | 'product-file';

  /** @example cover.png */
  @IsString()
  @MinLength(1)
  fileName: string;

  /** @example image/png */
  @IsString()
  @MinLength(1)
  contentType: string;

  /** Exact size of the file in bytes. */
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  sizeBytes: number;
}

export class PresignedUploadDto {
  /** PUT the file bytes to this URL. */
  UploadUrl: string;
  Method: 'PUT';
  /** Send exactly these headers with the PUT. */
  Headers: Record<string, string>;
  /** For `product-file`: save as the product's `fileKey`. */
  Key: string;
  /** For `image`: save as the product's `coverImageUrl` / gallery / section `imageUrl`. */
  PublicUrl?: string;
  ExpiresInSeconds: number;
}
