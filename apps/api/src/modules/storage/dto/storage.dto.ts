import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateUploadUrlDto {
  @ApiProperty({ example: 'hop-dong-phong-101.pdf', description: 'Original file name' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ example: 'application/pdf', description: 'MIME type of file' })
  @IsString()
  @IsNotEmpty()
  contentType: string;
}
