import { Component } from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {ThemeService} from "@core/services/theme.service";
import {AuthService} from "@core/services/auth.service";
import {NgIf} from "@angular/common";

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgIf],
  templateUrl: './navbar.component.html'
})
export class NavbarComponent {
  mobileOpen = false;
  constructor(public theme: ThemeService, public auth: AuthService) {}
  toggleMobile() { this.mobileOpen = !this.mobileOpen; }
  signIn() { this.auth.open(); this.auth.switch('signin'); console.info("sign in ")}
}
