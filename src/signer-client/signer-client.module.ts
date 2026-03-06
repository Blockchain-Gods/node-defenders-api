import { Global, Module } from '@nestjs/common';
import { SignerClientService } from './signer-client.service';

@Global()
@Module({
  providers: [SignerClientService],
  exports: [SignerClientService],
})
export class SignerClientModule {}