import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-website-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule
  ],
  templateUrl: './website-home.component.html',
  styleUrls: ['./website-home.component.scss']
})
export class WebsiteHomeComponent {
  trackingCode: string = '';
  error: string = '';

  constructor(private router: Router) {}

  trackPackage() {
    if (!this.trackingCode.trim()) {
      this.error = 'Veuillez entrer un code de suivi';
      return;
    }

    // Rediriger vers la page de suivi avec le code
    this.router.navigate(['/tracking'], {
      queryParams: { code: this.trackingCode }
    });
  }

  scrollToTracking() {
    const element = document.getElementById('tracking');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
