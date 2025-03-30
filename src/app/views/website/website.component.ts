import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WebsiteNavbarComponent } from './components/website-navbar/website-navbar.component';
import { WebsiteHomeComponent } from './components/website-home/website-home.component';

@Component({
  selector: 'app-website',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    WebsiteNavbarComponent,
   // WebsiteHomeComponent
  ],
  template: `
    <div class="website-container">
      <app-website-navbar />
      <div class="main-content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .website-container {
      min-height: 100vh;
      background-color: #f8f9fa;
      position: relative;
    }

    .main-content {
      padding-top: 10px; /* Espace supplémentaire pour éviter que le contenu ne soit caché sous la navbar */
    }
  `]
})
export class WebsiteComponent {}
