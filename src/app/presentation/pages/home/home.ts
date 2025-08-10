import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { ProfileMenuComponent } from '@presentation/components/profile-menu/profile-menu';
import { TokenStorageService } from '@infrastructure/services/token-storage.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, MatIconModule, ProfileMenuComponent],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly token = inject(TokenStorageService);
  isAuth() { return this.token.isAuthenticated(); }
}
