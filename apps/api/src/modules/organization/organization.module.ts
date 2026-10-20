import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Organization, OrganizationSchema } from './schemas/organization.schema';
import { OrganizationRepository } from './organization.repository';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
    ]),
  ],
  controllers: [OrganizationController],
  providers: [OrganizationRepository, OrganizationService],
  exports: [OrganizationRepository, OrganizationService],
})
export class OrganizationModule {}
