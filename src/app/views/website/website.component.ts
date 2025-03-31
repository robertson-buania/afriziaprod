import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WebsiteNavbarComponent } from './components/website-navbar/website-navbar.component';
import { WebsiteFooterComponent } from './components/website-footer/website-footer.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-website',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    FormsModule,
    TranslateModule,
    WebsiteNavbarComponent,
    WebsiteFooterComponent
  ],
  template: `
    <div class="website-container">
      <app-website-navbar />
      <div class="main-content">
        <router-outlet />
      </div>

      <!-- Footer -->
      <app-website-footer />

      <!-- Floating WhatsApp Button -->
      <a href="https://wa.me/243838716236" class="whatsapp-float">
        <i class="lab la-whatsapp"></i>
      </a>
    </div>
  `,
  styles: [`
    .website-container {
      min-height: 100vh;
      background-color: #f8f9fa;
      position: relative;
      display: flex;
      flex-direction: column;
    }

    .main-content {
      padding-top: 10px; /* Espace supplémentaire pour éviter que le contenu ne soit caché sous la navbar */
      flex: 1;
    }

    .whatsapp-float {
      position: fixed;
      width: 60px;
      height: 60px;
      bottom: 30px;
      right: 30px;
      background-color: #25D366;
      color: #FFF;
      border-radius: 50px;
      text-align: center;
      font-size: 2.5rem;
      box-shadow: 2px 2px 5px rgba(0,0,0,0.25);
      z-index: 1000;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: all 0.3s ease;
    }

    .whatsapp-float:hover {
      background-color: #20BA5C;
      color: white;
      transform: scale(1.1) translateY(-5px);
      box-shadow: 2px 5px 10px rgba(0,0,0,0.3);
    }
  `]
})
export class WebsiteComponent {}
