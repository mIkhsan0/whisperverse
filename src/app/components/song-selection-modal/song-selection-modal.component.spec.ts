import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SongSelectionModalComponent } from './song-selection-modal.component';

describe('SongSelectionModalComponent', () => {
  let component: SongSelectionModalComponent;
  let fixture: ComponentFixture<SongSelectionModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SongSelectionModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SongSelectionModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
