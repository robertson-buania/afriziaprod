import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phoneFormat',
  standalone: true
})
export class PhoneFormatPipe implements PipeTransform {
  transform(value: string | number): string {
    const phone = value.toString().replace(/\D/g, '');

    if (phone.length === 10) {
      return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    }
    if (phone.length === 12) {
      return phone.replace(/(\d{3})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
    }
    return phone;
  }
}
