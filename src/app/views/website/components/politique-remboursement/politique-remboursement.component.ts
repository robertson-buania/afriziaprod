import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-politique-remboursement',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './politique-remboursement.component.html',
  styleUrls: ['./politique-remboursement.component.scss']
})
export class PolitiqueRemboursementComponent implements OnInit {
  currentDate = new Date();

  constructor() { }

  ngOnInit(): void {
  }
}
