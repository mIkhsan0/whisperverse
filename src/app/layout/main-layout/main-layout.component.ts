import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router'; // Impor RouterOutlet
import { NavbarComponent } from '../../components/navbar/navbar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {

}
