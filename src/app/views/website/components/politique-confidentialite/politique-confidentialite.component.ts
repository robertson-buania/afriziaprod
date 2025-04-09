import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-politique-confidentialite',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './politique-confidentialite.component.html',
  styleUrl: './politique-confidentialite.component.scss'
})
export class PolitiqueConfidentialiteComponent implements OnInit {
  currentDate = new Date();

  constructor() { }

  ngOnInit(): void {
  }
}
