export interface Movie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult: boolean;
  video: boolean;
  original_language: string;
  genre_ids: number[];
  runtime?: number;
  budget?: number;
  revenue?: number;
  homepage?: string;
  imdb_id?: string;
  production_companies?: ProductionCompany[];
  production_countries?: ProductionCountry[];
  spoken_languages?: SpokenLanguage[];
  status?: string;
  tagline?: string;
  genres?: Genre[];
  credits?: Credits;
  videos?: VideoResults;
  reviews?: ReviewResults;
  similar?: TMDBResponse<Movie>;
  recommendations?: TMDBResponse<Movie>;
}

export interface TmdbItem {
  id: number;
  title?: string;
  name?: string; // for TV/person results if you use multi-search
  poster_path?: string | null;
  media_type?: string;
  first_air_date?: string;
  vote_average?:number;
  release_date?:string;
}

export interface Genre {
  id: number;
  name: string;
}

export interface ProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface ProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface SpokenLanguage {
  iso_639_1: string;
  name: string;
  english_name: string;
}

export interface Credits {
  cast: CastMember[];
  crew: CrewMember[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  credit_id: string;
  order: number;
  adult: boolean;
  gender: number | null;
  known_for_department: string;
  original_name: string;
  popularity: number;
  profile_path: string | null;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  credit_id: string;
  adult: boolean;
  gender: number | null;
  known_for_department: string;
  original_name: string;
  popularity: number;
  profile_path: string | null;
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  size: number;
  type: string;
  official: boolean;
  published_at: string;
}

export interface VideoResults {
  results: Video[];
}

export interface Review {
  id: string;
  author: string;
  author_details: AuthorDetails;
  content: string;
  created_at: string;
  updated_at: string;
  url: string;
}

export interface AuthorDetails {
  name: string;
  username: string;
  avatar_path: string | null;
  rating: number | null;
}

export interface ReviewResults {
  page: number;
  results: Review[];
  total_pages: number;
  total_results: number;
}

export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface MovieFilters {
  category?: 'popular' | 'top_rated' | 'upcoming' | 'now_playing';
  genre_ids?: number[];
  year?: number;
  min_rating?: number;
  sort_by?: string;
  language?: string;
  include_adult?: boolean;
}

export interface WatchlistItem {
  movie_id: number;
  movie: Movie;
  added_at: Date;
}

export interface FavoriteItem {
  movie_id: number;
  movie: Movie;
  added_at: Date;
}

export interface MovieRating {
  movie_id: number;
  rating: number;
  created_at: Date;
}