// Copyright (C) 2026 yam lynn
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License
// as published by the Free Software Foundation,
// either version 3 of the License, or (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty
// of MERCHANTIBILITY or FITNESS FOR A PARTICULAR PURPOSE.
// See the GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program. if not, see <https://www.gnu.org/licenses/>

#include <time.h>
#include <form.h>
#include <errno.h>
#include "swephexp.h"
#include "astro.h"
#include "ui.h"
#include "chronos.h"
#include "anim.h"
#include "draw.h"
#include "init.h"

#define SECOND 6
#define MINUTE 5
#define HOUR 4
#define DAY 3
#define MONTH 2
#define YEAR 1

static void enanosleep(unsigned int ms)
{
	struct timespec ts;
	ts.tv_sec = ms / 1000;
	ts.tv_nsec = (ms % 1000) * 1000000;
	nanosleep(&ts, NULL);
}

void cc_data(WINDOW *win, struct cdata *cdata, struct ui *ui)
{	
	int starty, startx;
	int count = (ui->cc == TRANSIT || ui->cc == SYNASTRY) ? 2 : 1;
	for (int i = 0; i < count; ++i)
	{
		if (ui->cc == TRANSIT || ui->cc == SYNASTRY)
		{
			i++;
			starty = 2;
			startx = COLS - 20;
		}
		else if (ui->left_trig)
		{
			starty = 1;
			startx = 33;
		}
		else if (!ui->left_trig)
		{
			starty = 1;
			startx = 1;
		}
		
		if(cdata->chart_name)
			mvwprintw(win, starty, startx, "%s", cdata->chart_name);
		
		if (ui->cc != TRANSIT || ui->cc != SYNASTRY)
		{
			starty += 1;
			if (cdata->state && !isdigit((unsigned char)cdata->state[0]) && strlen(cdata->state) > 1)
				mvwprintw(win, starty, startx, "%.22s, %s, %s", cdata->city, cdata->state, cdata->country);
			
			else if (cdata->country && cdata->city && strlen(cdata->country) > 0 && strlen(cdata->city) > 0)
				mvwprintw(win, starty, startx, "%.22s, %s", cdata->city, cdata->country);
		}
			
		starty += 1;
		
		if(cdata->year && cdata->mon && cdata->mday)
			mvwprintw(win, starty, startx, "%s.%02d.%02d, %s", 
			ui->sym.month[cdata->mon], cdata->mday, cdata->year, ui->sym.week[cdata->wday]);
			
		starty += 1;
		if (cdata->hour >= 0)
		{
			int hour = cdata->hour;
			if (hour == 12)
				mvwprintw(win, starty, startx, "%02d:%02d:%02dPM", cdata->hour, cdata->min, cdata->sec);
			else if (hour > 12)	
				mvwprintw(win, starty, startx, "%02d:%02d:%02dPM", cdata->hour - 12, cdata->min, cdata->sec);
			else if (hour == 0)
				mvwprintw(win, starty, startx, "12:%02d:%02dAM", cdata->min, cdata->sec);
			else if (hour > 0 && hour < 12)
				mvwprintw(win, starty, startx, "%02d:%02d:%02dAM", cdata->hour, cdata->min, cdata->sec);
		}
		starty += 1;
		
		int utc = cdata->hour - (int)cdata->utc_hour;
		if (utc < - 12)
			utc += 24;
		else if (utc > 14)
			utc -= 24;
			
		if (cdata->isdst == YDST)
			mvwprintw(win, starty, startx, "DST UTC%+02d", utc);
		else
			mvwprintw(win, starty, startx, "UTC%+02d", utc);
		if (i > 0)
			return;
			
		starty += 1;
		if (cdata->timezone)
			mvwprintw(win, starty, startx, "%.30s", cdata->timezone);
		
		starty += 1;
		if (fabs(cdata->dlat) > 1e-6)
			mvwprintw(win, starty, startx, "%f", cdata->dlat);
		
		starty += 1;
		if (fabs(cdata->dlon) > 1e-6)
			mvwprintw(win, starty, startx, "%f", cdata->dlon);
	}
}

void realtime_chart(struct cdata *cdata, struct pxx *pxx, struct ui *ui, double **planet, int **zodiac)
{
	nodelay(ui->main_win, TRUE);
		
	int ch = 0;
	while ((ch = wgetch(ui->main_win)) != 9)
	{
		set_localtime(cdata);
		wheel_init(ui->main_win, ui, 0, 0, 0);
		new_chart(cdata, pxx, ui, planet, zodiac);
		
		wattron(ui->main_win, COLOR_PAIR(FIRE));
		mvwprintw(ui->main_win, 0, COLS - 14, "*live");
		wattroff(ui->main_win, COLOR_PAIR(FIRE));
		
		wnoutrefresh(ui->main_win);
	
		table_trigger(ui, ch);
		for (int i = 0; i < 10; ++i)
		{
			enanosleep(10);
			if (ch == 9 || ch == 'q')
				break;
		}
		doupdate();
		
		if (ch == 9 || ch == 'q')
			break;
	}
	wmove(ui->main_win, 0, COLS - 14);
	wclrtoeol(ui->main_win);
	nodelay(ui->main_win, FALSE);
}

void transit(struct cdata **cdata, struct pxx **pxx, struct ui *ui, double **planet, int **zodiac)
{
	ui->transit_window = newwin(LINES, COLS, 0, 0);
	ui->transit_panel = new_panel(ui->transit_window);
	
	ui->bcc = ui->cc;
	cdata[TRANSIT]->t_cusp = cdata[ui->bcc]->sign_cusp[1];
	
	wheel_init(ui->main_win, ui, 3, 0, 0);
	new_chart(cdata[ui->bcc], pxx[ui->bcc], ui, planet, zodiac);
	
	ui->cc = TRANSIT;
	planet_init(planet, ui->cc, pxx);
	pxx_init(cdata[ui->cc], pxx[ui->cc], planet);
	
	doupdate();
	animate_chart(cdata[ui->cc], pxx[ui->cc], ui, planet, zodiac);
				
	ui->cc = ui->bcc;
	wheel_init(ui->main_win, ui, 0, 0, 0);
	
	del_panel(ui->transit_panel);
	delwin(ui->transit_window);
}

void synastry(struct cdata **cdata, struct pxx **pxx, struct ui *ui, double **planet, int **zodiac, int key)
{
	wheel_init(ui->main_win, ui, 3, 0, 0);
	new_chart(cdata[ui->cc], pxx[ui->cc], ui, planet, zodiac);
	
	planet_init(planet, key, pxx);
	pxx_init(cdata[key], pxx[key], planet);
	
	double tmp = cdata[key]->sign_cusp[1];
	cdata[key]->sign_cusp[1] = cdata[ui->cc]->sign_cusp[1];
	
	wheel_init(ui->main_win, ui, 0, 9, 0);
	
	ui->bcc = ui->cc;
	ui->cc = SYNASTRY;
	planet_pos(ui->main_win, cdata[key], ui, planet, zodiac);
	cc_data(ui->main_win, cdata[key], ui);
	ui->cc = ui->bcc;
	
	cdata[key]->sign_cusp[1] = tmp;
	
	wnoutrefresh(ui->main_win);
	doupdate();
	wheel_init(ui->main_win, ui, 0, 0, 0);
}

static void arrange_panel(struct cdata *cdata, struct pxx *pxx, struct ui *ui,
double **planet, int **zodiac)
{
	overwrite(ui->main_win, ui->transit_window);
	pxx_init(cdata, pxx, planet);
	wheel_init(ui->main_win, ui, 0, 9, 0);
	planet_pos(ui->transit_window, cdata, ui, planet, zodiac);
	cc_data(ui->transit_window, cdata, ui);
					
	top_panel(ui->main_panel);
	top_panel(ui->transit_panel);
	
	if (ui->left_trig)
		top_panel(ui->left_panel);
	if (ui->right_trig)
		top_panel(ui->right_panel);
		
	update_panels();
	doupdate();
}

void animate_chart(struct cdata *cdata, struct pxx *pxx, struct ui *ui, double **planet, int **zodiac)
{
	int starty = 0;
	int startx = COLS - 14;
	
	mvwprintw(ui->main_win, starty, startx, "(hour)");
	if (ui->cc == TRANSIT)
		arrange_panel(cdata, pxx, ui, planet, zodiac);
	
	int max_day = 0; // daycount() return flag
	size_t inc = HOUR;
	
	struct tm temp = {0};
	time_t t = 0;
	
	cpt(cdata, &temp, &t, 0);
	
	int ch = 0;
	int anim_done = 0;
	while(!anim_done && (ch = wgetch(ui->main_win)))
	{
		if (ui->cc == TRANSIT)
			top_panel(ui->transit_panel);
			
		if (table_trigger(ui, ch) == 1)
		{
			new_chart(cdata, pxx, ui, planet, zodiac);
			doupdate();
		}
	
		switch(ch)
		{
			case 'k': case KEY_UP:
				switch(inc)
				{
					case SECOND:
						t += 1;
						break;
					case MINUTE:
						t += 60;
						break;
					case HOUR:
						t += 3600;
						break;
					case DAY:
						t += 86400;
						break;
					case MONTH:
						if ((++temp.tm_mon) > 11)
						{
							temp.tm_mon = 0;
							++temp.tm_year;
						}
						max_day = daycount(temp.tm_mon, temp.tm_year);
						if (temp.tm_mday > max_day)
							temp.tm_mday = max_day;
						t = mktime(&temp);
						ecst_init(planet, cdata->se);
						break;
					case YEAR:
						temp.tm_year++;
						if (temp.tm_year > 16799)
							temp.tm_year = -12998;
						t = mktime(&temp);
						ecst_init(planet, cdata->se);
						break;
				}
				cpt(cdata, &temp, &t, 1);
				
				if (ui->cc == TRANSIT)
					arrange_panel(cdata, pxx, ui, planet, zodiac);
				else
					new_chart(cdata, pxx, ui, planet, zodiac);
				break;
				
			case 'j': case KEY_DOWN:
				switch(inc)
				{
					case SECOND:
						t -= 1;
						break;
					case MINUTE:
						t -= 60;
						break;
					case HOUR:
						t -= 3600;
						break;
					case DAY:
						t -= 86400;
						break;
					case MONTH:
						if ((--temp.tm_mon) < 0)
						{
							temp.tm_mon = 11;
							--temp.tm_year;
						}
						max_day = daycount(temp.tm_mon, temp.tm_year);
						if (temp.tm_mday > max_day)
							temp.tm_mday = max_day;
						t = mktime(&temp);
						ecst_init(planet, cdata->se);
						break;
					case YEAR:
						--temp.tm_year;
						if (temp.tm_year < -12998)
							temp.tm_year = 16799;
						t = mktime(&temp);
						ecst_init(planet, cdata->se);
						break;
				}
				cpt(cdata, &temp, &t, 1);
				
				if (ui->cc == TRANSIT)
					arrange_panel(cdata, pxx, ui, planet, zodiac);
				else
					new_chart(cdata, pxx, ui, planet, zodiac);
				break;
				
			case 'h': case KEY_LEFT:
				if (inc != SECOND)
					++inc;
				break;
				
			case 'l': case KEY_RIGHT:
				if (inc != YEAR)
					--inc;
				break;
				
			case '\n': case 'q': case 't':
				anim_done = 1;
				break;
		}
		if (ui->cc == TRANSIT)
			arrange_panel(cdata, pxx, ui, planet, zodiac);
	
		flushinp();
		enanosleep(10);
		switch(inc)
		{
			case SECOND:
				wmove(ui->main_win, starty, startx);
				wclrtoeol(ui->main_win);
				mvwprintw(ui->main_win, starty, startx, "(sec)");
				break;
				
			case MINUTE:
				wmove(ui->main_win, starty, startx);
				wclrtoeol(ui->main_win);
				mvwprintw(ui->main_win, starty, startx, "(min)");
				break;
				
			case HOUR:
				wmove(ui->main_win, starty, startx);
				wclrtoeol(ui->main_win);
				mvwprintw(ui->main_win, starty, startx, "(hour)");
				break;
				
			case DAY:
				wmove(ui->main_win, starty, startx);
				wclrtoeol(ui->main_win);
				mvwprintw(ui->main_win, starty, startx, "(day)");
				break;
				
			case MONTH:
				wmove(ui->main_win, starty, startx);
				wclrtoeol(ui->main_win);
				mvwprintw(ui->main_win, starty, startx, "(mon)");
				break;
				
			case YEAR:
				wmove(ui->main_win, starty, startx);
				wclrtoeol(ui->main_win);
				mvwprintw(ui->main_win, starty, startx, "(year)");
				break;
		}
		if (ui->cc == TRANSIT)
		{
			copywin(ui->main_win, ui->transit_window, 
			starty, startx,
			starty, startx,
			starty, startx + 5,
			FALSE);
			update_panels();
			doupdate();
		}
	}
	wmove(ui->main_win, starty, startx);
	wclrtoeol(ui->main_win);
	wnoutrefresh(ui->main_win);
}
